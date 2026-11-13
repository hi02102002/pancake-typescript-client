const DEFAULT_BASE_URLS = {
  user: 'https://pages.fm/api/v1',
  pageV1: 'https://pages.fm/api/public_api/v1',
  pageV2: 'https://pages.fm/api/public_api/v2',
} as const

type Scope = keyof typeof DEFAULT_BASE_URLS

export interface PancakeTransportOptions {
  accessToken?: string
  pageAccessToken?: string
  pageId?: string
  fetch?: typeof fetch
  timeoutMs?: number
  maxRetries?: number
  rateLimit?: boolean
  baseUrls?: Partial<Record<Scope, string>>
}

export interface PancakeRequestOptions {
  scope: Scope
  method: string
  path: string
  query?: Record<string, unknown> | undefined
  body?: unknown
  signal?: AbortSignal | undefined
  responseType?: 'json' | 'blob' | 'text' | undefined
  /** Only for endpoints explicitly documented as public. */
  auth?: false | undefined
}

export interface PancakeApiErrorOptions {
  status?: number
  statusText?: string
  code?: string | number
  details?: unknown
  retryAfterMs?: number
  cause?: unknown
}

/** An HTTP error or a successful HTTP response whose Pancake payload failed. */
export class PancakeApiError extends Error {
  readonly status: number | undefined
  readonly statusText: string | undefined
  readonly code: string | number | undefined
  readonly details?: unknown
  readonly retryAfterMs: number | undefined

  constructor(message: string, options: PancakeApiErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause })
    this.name = 'PancakeApiError'
    this.status = options.status
    this.statusText = options.statusText
    this.code = options.code
    this.details = options.details
    this.retryAfterMs = options.retryAfterMs
  }
}

interface ParsedResponse {
  value: unknown
  errorPayload: unknown
}

export class PancakeTransport {
  private readonly accessToken: string | undefined
  private readonly pageAccessToken: string | undefined
  private readonly pageId: string | undefined
  private readonly fetchImpl: typeof fetch
  private readonly timeoutMs: number
  private readonly maxRetries: number
  private readonly rateLimit: boolean
  private readonly baseUrls: Record<Scope, string>
  private nextPageRequestAt = 0
  private pageQueue: Promise<void> = Promise.resolve()

  constructor(options: PancakeTransportOptions = {}) {
    this.accessToken = options.accessToken
    this.pageAccessToken = options.pageAccessToken
    this.pageId = options.pageId
    this.fetchImpl = options.fetch ?? globalThis.fetch
    if (!this.fetchImpl) throw new Error('A fetch implementation is required')

    this.timeoutMs = toNonNegativeInteger(options.timeoutMs, 30_000, 'timeoutMs')
    this.maxRetries = toNonNegativeInteger(options.maxRetries, 3, 'maxRetries')
    this.rateLimit = options.rateLimit ?? true
    this.baseUrls = { ...DEFAULT_BASE_URLS, ...options.baseUrls }
  }

  async request<T>(options: PancakeRequestOptions): Promise<T> {
    const method = options.method.toUpperCase()
    const pageScoped = options.scope !== 'user'

    if (pageScoped && !this.pageId) {
      throw new Error('pageId is required for page-scoped requests')
    }

    const url = this.buildUrl(options, pageScoped)
    const maxAttempts = method === 'GET' ? this.maxRetries + 1 : 1

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      throwIfAborted(options.signal)
      if (pageScoped && this.rateLimit) await this.waitForPageRateLimit(options.signal)

      try {
        return await this.execute<T>(url, method, options)
      } catch (error) {
        const canRetry = attempt + 1 < maxAttempts && this.isRetryable(error, options.signal)
        if (!canRetry) {
          if (options.signal?.aborted) throw options.signal.reason ?? error
          throw this.redactError(error)
        }

        const retryAfterMs = error instanceof PancakeApiError ? error.retryAfterMs : undefined
        await abortableDelay(retryAfterMs ?? backoffMs(attempt), options.signal)
      }
    }

    throw new Error('Unreachable request state')
  }

  private buildUrl(options: PancakeRequestOptions, pageScoped: boolean): URL {
    const needsPageId = /\{page_id\}|:page_id(?=\/|$)/.test(options.path)
    if (needsPageId && !this.pageId) throw new Error('pageId is required for paths containing page_id')
    const path = needsPageId ? substitutePageId(options.path, this.pageId!) : options.path
    const baseUrl = this.baseUrls[options.scope].replace(/\/+$/, '')
    const relativePath = path.replace(/^\/+/, '')
    const url = new URL(`${baseUrl}/${relativePath}`)

    appendQuery(url.searchParams, options.query)

    if (options.auth === false) {
      return url
    }
    if (pageScoped) {
      if (!this.pageAccessToken) throw new Error('pageAccessToken is required for page-scoped requests')
      url.searchParams.set('page_access_token', this.pageAccessToken)
    } else {
      if (!this.accessToken) throw new Error('accessToken is required for user-scoped requests')
      url.searchParams.set('access_token', this.accessToken)
    }

    return url
  }

  private async execute<T>(url: URL, method: string, options: PancakeRequestOptions): Promise<T> {
    const headers = new Headers()
    let body: BodyInit | undefined

    if (options.body !== undefined) {
      if (isBodyInit(options.body)) {
        body = options.body
      } else {
        headers.set('content-type', 'application/json')
        body = JSON.stringify(options.body)
      }
    }

    const timeoutController = new AbortController()
    const timeout = this.timeoutMs > 0
      ? setTimeout(() => timeoutController.abort(new Error(`Request timed out after ${this.timeoutMs}ms`)), this.timeoutMs)
      : undefined
    const signal = combineSignals(options.signal, timeoutController.signal)

    try {
      const init: RequestInit = { method, headers, signal }
      if (body !== undefined) init.body = body
      const response = await this.fetchImpl(url, init)
      const parsed = await parseResponse(response, options.responseType ?? 'json')
      const retryAfterMs = parseRetryAfter(response.headers.get('retry-after'))

      if (!response.ok) {
        throw this.apiError(response, parsed.errorPayload, retryAfterMs)
      }

      if (isFailedPayload(parsed.errorPayload)) {
        throw this.apiError(response, parsed.errorPayload, retryAfterMs)
      }

      return parsed.value as T
    } catch (error) {
      if (timeoutController.signal.aborted && !options.signal?.aborted) {
        throw new PancakeApiError(`Request timed out after ${this.timeoutMs}ms`)
      }
      throw error
    } finally {
      if (timeout !== undefined) clearTimeout(timeout)
    }
  }

  private apiError(response: Response, payload: unknown, retryAfterMs?: number): PancakeApiError {
    const payloadRecord = asRecord(payload)
    const rawMessage = firstString(
      payloadRecord?.message,
      payloadRecord?.error,
      payloadRecord?.error_message,
      response.statusText,
      `Pancake API request failed with status ${response.status}`,
    )

    const errorOptions: PancakeApiErrorOptions = {
      status: response.status,
      statusText: response.statusText,
      details: redactValue(payload, this.secrets()),
    }
    const code = stringOrNumber(payloadRecord?.code ?? payloadRecord?.error_code)
    if (code !== undefined) errorOptions.code = code
    if (retryAfterMs !== undefined) errorOptions.retryAfterMs = retryAfterMs
    return new PancakeApiError(this.redact(rawMessage), errorOptions)
  }

  private isRetryable(error: unknown, callerSignal?: AbortSignal): boolean {
    if (callerSignal?.aborted) return false
    if (!(error instanceof PancakeApiError)) return true
    if (error.status === undefined) return true
    return error.status === 429 || error.status >= 500
  }

  private async waitForPageRateLimit(signal?: AbortSignal): Promise<void> {
    const previous = this.pageQueue
    let release!: () => void
    this.pageQueue = new Promise<void>((resolve) => { release = resolve })

    try {
      await previous
      throwIfAborted(signal)
      const waitMs = Math.max(0, this.nextPageRequestAt - Date.now())
      if (waitMs > 0) await abortableDelay(waitMs, signal)
      this.nextPageRequestAt = Date.now() + 200
    } finally {
      release()
    }
  }

  private redactError(error: unknown): unknown {
    if (error instanceof PancakeApiError) return error
    if (error instanceof Error) {
      return new PancakeApiError(this.redact(error.message || 'Pancake API request failed'))
    }
    return new PancakeApiError(this.redact(String(error)))
  }

  private redact(value: string): string {
    let result = value.replace(/([?&](?:access_token|page_access_token)=)[^&#\s]*/gi, '$1[REDACTED]')
    for (const secret of this.secrets()) result = result.split(secret).join('[REDACTED]')
    return result
  }

  private secrets(): string[] {
    return [this.accessToken, this.pageAccessToken].filter((value): value is string => Boolean(value))
  }
}

function toNonNegativeInteger(value: number | undefined, fallback: number, name: string): number {
  if (value === undefined) return fallback
  if (!Number.isInteger(value) || value < 0) throw new TypeError(`${name} must be a non-negative integer`)
  return value
}

function substitutePageId(path: string, pageId: string): string {
  return path
    .replace(/\{page_id\}/g, encodeURIComponent(pageId))
    .replace(/:page_id(?=\/|$)/g, encodeURIComponent(pageId))
}

function appendQuery(searchParams: URLSearchParams, query?: Record<string, unknown>): void {
  if (!query) return
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      for (const item of value) appendQueryValue(searchParams, key, item)
    } else {
      appendQueryValue(searchParams, key, value)
    }
  }
}

function appendQueryValue(searchParams: URLSearchParams, key: string, value: unknown): void {
  if (value === undefined) return
  if (value === null) searchParams.append(key, '')
  else if (typeof value === 'object') searchParams.append(key, JSON.stringify(value))
  else searchParams.append(key, String(value))
}

function isBodyInit(value: unknown): value is BodyInit {
  return typeof value === 'string'
    || value instanceof FormData
    || value instanceof URLSearchParams
    || value instanceof Blob
    || value instanceof ArrayBuffer
    || ArrayBuffer.isView(value)
    || (typeof ReadableStream !== 'undefined' && value instanceof ReadableStream)
}

async function parseResponse(response: Response, responseType: 'json' | 'blob' | 'text'): Promise<ParsedResponse> {
  if (responseType === 'blob') {
    const value = await response.blob()
    const contentType = response.headers.get('content-type') ?? value.type
    const errorPayload = /(?:^|[+/])json(?:;|$)/i.test(contentType)
      ? tryParseJson(await value.text()) ?? value
      : value
    return { value, errorPayload }
  }

  const text = await response.text()
  const parsed = tryParseJson(text)

  if (responseType === 'text' && response.ok) return { value: text, errorPayload: parsed ?? text }
  return { value: text === '' ? undefined : (parsed ?? text), errorPayload: parsed ?? text }
}

function tryParseJson(text: string): unknown {
  if (!text) return undefined
  try { return JSON.parse(text) } catch { return undefined }
}

function isFailedPayload(value: unknown): boolean {
  return asRecord(value)?.success === false
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function firstString(...values: unknown[]): string {
  return values.find((value): value is string => typeof value === 'string' && value.length > 0)
    ?? 'Pancake API request failed'
}

function stringOrNumber(value: unknown): string | number | undefined {
  return typeof value === 'string' || typeof value === 'number' ? value : undefined
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000
  const date = Date.parse(value)
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now())
}

function backoffMs(attempt: number): number {
  return Math.min(250 * (2 ** attempt), 4_000)
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw signal.reason ?? new DOMException('The operation was aborted', 'AbortError')
}

function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) {
    throwIfAborted(signal)
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(finish, ms)
    signal?.addEventListener('abort', abort, { once: true })

    function finish(): void {
      signal?.removeEventListener('abort', abort)
      resolve()
    }

    function abort(): void {
      clearTimeout(timer)
      reject(signal?.reason ?? new DOMException('The operation was aborted', 'AbortError'))
    }
  })
}

function combineSignals(callerSignal: AbortSignal | undefined, timeoutSignal: AbortSignal): AbortSignal {
  if (!callerSignal) return timeoutSignal
  if (typeof AbortSignal.any === 'function') return AbortSignal.any([callerSignal, timeoutSignal])

  const controller = new AbortController()
  const abort = (signal: AbortSignal) => controller.abort(signal.reason)
  if (callerSignal.aborted) abort(callerSignal)
  else if (timeoutSignal.aborted) abort(timeoutSignal)
  else {
    callerSignal.addEventListener('abort', () => abort(callerSignal), { once: true })
    timeoutSignal.addEventListener('abort', () => abort(timeoutSignal), { once: true })
  }
  return controller.signal
}

function redactValue(value: unknown, secrets: string[]): unknown {
  if (typeof value === 'string') {
    let redacted = value.replace(/([?&](?:access_token|page_access_token)=)[^&#\s]*/gi, '$1[REDACTED]')
    for (const secret of secrets) redacted = redacted.split(secret).join('[REDACTED]')
    return redacted
  }
  if (Array.isArray(value)) return value.map((item) => redactValue(item, secrets))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key,
      /^(?:access_token|page_access_token)$/i.test(key) ? '[REDACTED]' : redactValue(item, secrets),
    ]))
  }
  return value
}
