import { PancakeWebhookError } from './errors.js'
import {
  isConnectStatusWebhookPayload,
  isConversationWebhookPayload,
  isMessagingWebhookPayload,
  isPostWebhookPayload,
  isSubscriptionWebhookPayload,
} from './guards.js'
import { createWebhookAckResponse, parseWebhookRequest } from './parser.js'
import type {
  PancakeConnectStatusWebhookPayload,
  PancakeConversationWebhookPayload,
  PancakeMessagingWebhookPayload,
  PancakePostWebhookPayload,
  PancakeSubscriptionWebhookPayload,
  PancakeUnknownWebhookPayload,
  PancakeWebhookHandlerContext,
  PancakeWebhookHandlerOptions,
  PancakeWebhookHandlers,
} from './types.js'

/**
 * Framework-neutral HTTP handler for Pancake Webhook POST requests.
 *
 * Automatically parses incoming JSON, preserves raw body, dispatches to typed event
 * callbacks, and returns an HTTP 200 acknowledgment after callbacks finish.
 * Keep callbacks short: enqueue durable work before returning to avoid webhook timeouts.
 *
 * @example
 * ```ts
 * export async function POST(request: Request) {
 *   return handleWebhookRequest(request, {
 *     onMessaging: async (event) => {
 *       console.log('New message:', event.data.message?.message)
 *     },
 *     onConversation: async (event) => {
 *       console.log('Conversation updated:', event.data.conversation.id)
 *     },
 *   })
 * }
 * ```
 */
export async function handleWebhookRequest(
  request: Request,
  handlers: PancakeWebhookHandlers = {},
  options: PancakeWebhookHandlerOptions = {},
): Promise<Response> {
  let rawBody: string | undefined
  let rawPayload: unknown | undefined

  try {
    const parsed = await parseWebhookRequest(request, {
      strictMethod: options.strictMethod,
    })
    rawBody = parsed.rawBody
    rawPayload = parsed.rawPayload
    const { event } = parsed

    const context: PancakeWebhookHandlerContext = {
      event,
      request,
      rawBody,
      rawPayload,
    }

    switch (event.event_type) {
      case 'messaging':
        if (isMessagingWebhookPayload(event) && handlers.onMessaging) {
          await handlers.onMessaging(
            event,
            context as PancakeWebhookHandlerContext<PancakeMessagingWebhookPayload>,
          )
        }
        break
      case 'conversation':
        if (isConversationWebhookPayload(event) && handlers.onConversation) {
          await handlers.onConversation(
            event,
            context as PancakeWebhookHandlerContext<PancakeConversationWebhookPayload>,
          )
        }
        break
      case 'post':
        if (isPostWebhookPayload(event) && handlers.onPost) {
          await handlers.onPost(
            event,
            context as PancakeWebhookHandlerContext<PancakePostWebhookPayload>,
          )
        }
        break
      case 'subscription':
        if (isSubscriptionWebhookPayload(event) && handlers.onSubscription) {
          await handlers.onSubscription(
            event,
            context as PancakeWebhookHandlerContext<PancakeSubscriptionWebhookPayload>,
          )
        }
        break
      case 'connect_status':
        if (isConnectStatusWebhookPayload(event) && handlers.onConnectStatus) {
          await handlers.onConnectStatus(
            event,
            context as PancakeWebhookHandlerContext<PancakeConnectStatusWebhookPayload>,
          )
        }
        break
      default:
        if (handlers.onUnknown) {
          await handlers.onUnknown(
            event as PancakeUnknownWebhookPayload,
            context as PancakeWebhookHandlerContext<PancakeUnknownWebhookPayload>,
          )
        }
        break
    }

    if (handlers.onEvent) {
      await handlers.onEvent(event, context)
    }

    return createWebhookAckResponse(options.ackResponse)
  } catch (error) {
    if (handlers.onError) {
      const customResponse = await handlers.onError(error, {
        error,
        request,
        ...(rawBody !== undefined ? { rawBody } : {}),
        ...(rawPayload !== undefined ? { rawPayload } : {}),
      })
      if (customResponse instanceof Response) {
        return customResponse
      }
    }

    if (error instanceof PancakeWebhookError) {
      return new Response(
        JSON.stringify({
          error: error.message,
          code: error.code,
        }),
        {
          status: error.statusCode,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    return new Response(
      JSON.stringify({
        error: 'Internal webhook handler error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}
