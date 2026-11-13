/**
 * Error thrown when webhook request parsing or validation fails.
 */
export class PancakeWebhookError extends Error {
  readonly code: string
  readonly statusCode: number

  constructor(
    message: string,
    options?: {
      code?: string
      statusCode?: number
      cause?: unknown
    },
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined)
    this.name = 'PancakeWebhookError'
    this.code = options?.code ?? 'INVALID_WEBHOOK'
    this.statusCode = options?.statusCode ?? 400
  }
}
