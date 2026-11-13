import { PancakeWebhookError } from './errors.js'
import { assertWebhookPayload } from './guards.js'
import type { PancakeWebhookPayload, ParsedWebhookRequest } from './types.js'

/**
 * Options for `parseWebhookRequest`.
 */
export interface ParseWebhookRequestOptions {
  /**
   * Whether to require HTTP method POST. Defaults to true.
   */
  readonly strictMethod?: boolean | undefined
}

/**
 * Parses and validates an unknown payload (JSON string or JavaScript object) into a PancakeWebhookPayload.
 *
 * @throws {PancakeWebhookError} if the input is invalid JSON or does not match the webhook payload contract.
 */
export function parseWebhookPayload(input: unknown): PancakeWebhookPayload {
  let parsed: unknown = input

  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input)
    } catch (cause) {
      throw new PancakeWebhookError('Invalid JSON in webhook payload', {
        code: 'INVALID_JSON',
        statusCode: 400,
        cause,
      })
    }
  }

  assertWebhookPayload(parsed)
  return parsed
}

/**
 * Framework-neutral Request parser.
 * Reads the request body, preserves the raw payload string and object, and returns the typed event.
 *
 * @throws {PancakeWebhookError} if the method is not POST or body is malformed.
 */
export async function parseWebhookRequest<T extends PancakeWebhookPayload = PancakeWebhookPayload>(
  request: Request,
  options: ParseWebhookRequestOptions = {},
): Promise<ParsedWebhookRequest<T>> {
  const strictMethod = options.strictMethod ?? true

  if (strictMethod && request.method.toUpperCase() !== 'POST') {
    throw new PancakeWebhookError(
      `Pancake webhooks require HTTP POST (received ${request.method})`,
      {
        code: 'INVALID_METHOD',
        statusCode: 405,
      },
    )
  }

  let rawBody: string
  try {
    rawBody = await request.text()
  } catch (cause) {
    throw new PancakeWebhookError('Failed to read webhook request body', {
      code: 'BODY_READ_ERROR',
      statusCode: 400,
      cause,
    })
  }

  let rawPayload: unknown
  try {
    rawPayload = JSON.parse(rawBody)
  } catch (cause) {
    throw new PancakeWebhookError('Invalid JSON in webhook request body', {
      code: 'INVALID_JSON',
      statusCode: 400,
      cause,
    })
  }

  assertWebhookPayload(rawPayload)

  return {
    event: rawPayload as T,
    rawBody,
    rawPayload,
  }
}

/**
 * Creates a standard HTTP 200 acknowledgment response for Pancake webhooks.
 *
 * Pancake expects a quick HTTP 200 response to prevent automatic webhook suspension.
 */
export function createWebhookAckResponse(
  body: unknown = { success: true },
  init?: ResponseInit,
): Response {
  if (body instanceof Response) {
    return body
  }

  const status = init?.status ?? 200
  const headers = new Headers(init?.headers)
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    ...init,
    status,
    headers,
  })
}
