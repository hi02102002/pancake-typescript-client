import { PancakeWebhookError } from './errors.js'
import type {
  PancakeConnectStatusWebhookPayload,
  PancakeConversationWebhookPayload,
  PancakeMessagingWebhookPayload,
  PancakePostWebhookPayload,
  PancakeSubscriptionWebhookPayload,
  PancakeWebhookEvent,
  PancakeWebhookPayload,
  WebhookValidationResult,
} from './types.js'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Type guard checking if an unknown value satisfies the minimal shape of a Pancake webhook payload.
 */
export function isWebhookPayload(value: unknown): value is PancakeWebhookPayload {
  if (!isRecord(value)) return false
  if (typeof value.event_type !== 'string' || value.event_type.trim() === '') return false
  if (!isRecord(value.data)) return false
  return true
}

/**
 * Type guard checking if a payload matches one of the 5 documented Pancake webhook events.
 */
export function isKnownWebhookEvent(value: unknown): value is PancakeWebhookEvent {
  if (!isWebhookPayload(value)) return false
  return (
    value.event_type === 'messaging' ||
    value.event_type === 'conversation' ||
    value.event_type === 'post' ||
    value.event_type === 'subscription' ||
    value.event_type === 'connect_status'
  )
}

/**
 * Type guard narrowing a payload to a `messaging` event.
 */
export function isMessagingWebhookPayload(
  payload: PancakeWebhookPayload,
): payload is PancakeMessagingWebhookPayload {
  return payload.event_type === 'messaging' && typeof payload.page_id === 'string'
}

/**
 * Type guard narrowing a payload to a `conversation` event.
 */
export function isConversationWebhookPayload(
  payload: PancakeWebhookPayload,
): payload is PancakeConversationWebhookPayload {
  if (payload.event_type !== 'conversation' || typeof payload.page_id !== 'string') return false
  const data = payload.data as Record<string, unknown> | undefined
  return isRecord(data?.conversation)
}

/**
 * Type guard narrowing a payload to a `post` event.
 */
export function isPostWebhookPayload(
  payload: PancakeWebhookPayload,
): payload is PancakePostWebhookPayload {
  if (payload.event_type !== 'post' || typeof payload.page_id !== 'string') return false
  const data = payload.data as Record<string, unknown> | undefined
  return isRecord(data?.post)
}

/**
 * Type guard narrowing a payload to a `subscription` event.
 */
export function isSubscriptionWebhookPayload(
  payload: PancakeWebhookPayload,
): payload is PancakeSubscriptionWebhookPayload {
  if (payload.event_type !== 'subscription') return false
  const data = payload.data as Record<string, unknown> | undefined
  return isRecord(data?.subscription)
}

/**
 * Type guard narrowing a payload to a `connect_status` event.
 */
export function isConnectStatusWebhookPayload(
  payload: PancakeWebhookPayload,
): payload is PancakeConnectStatusWebhookPayload {
  if (payload.event_type !== 'connect_status' || typeof payload.page_id !== 'string') return false
  const data = payload.data as Record<string, unknown> | undefined
  return (
    isRecord(data) &&
    typeof data.connect_status === 'string' &&
    typeof data.page_id === 'string'
  )
}

/**
 * Runtime validation distinguishing arbitrary unknown data from a valid PancakeWebhookPayload.
 */
export function validateWebhookPayload(value: unknown): WebhookValidationResult<PancakeWebhookPayload> {
  if (!isRecord(value)) {
    return { success: false, error: 'Webhook payload must be a non-null object' }
  }

  const eventType = value.event_type
  if (typeof eventType !== 'string' || eventType.trim() === '') {
    return { success: false, error: 'Webhook payload is missing string property "event_type"' }
  }

  const data = value.data
  if (!isRecord(data)) {
    return { success: false, error: 'Webhook payload is missing object property "data"' }
  }

  switch (eventType) {
    case 'messaging': {
      if (typeof value.page_id !== 'string') {
        return { success: false, error: 'Messaging webhook requires string "page_id"' }
      }
      break
    }
    case 'conversation': {
      if (typeof value.page_id !== 'string') {
        return { success: false, error: 'Conversation webhook requires string "page_id"' }
      }
      if (!isRecord(data.conversation)) {
        return { success: false, error: 'Conversation webhook requires object "data.conversation"' }
      }
      break
    }
    case 'post': {
      if (typeof value.page_id !== 'string') {
        return { success: false, error: 'Post webhook requires string "page_id"' }
      }
      if (!isRecord(data.post)) {
        return { success: false, error: 'Post webhook requires object "data.post"' }
      }
      break
    }
    case 'subscription': {
      if (!isRecord(data.subscription)) {
        return { success: false, error: 'Subscription webhook requires object "data.subscription"' }
      }
      break
    }
    case 'connect_status': {
      if (typeof value.page_id !== 'string') {
        return { success: false, error: 'ConnectStatus webhook requires string "page_id"' }
      }
      if (typeof data.connect_status !== 'string') {
        return { success: false, error: 'ConnectStatus webhook requires string "data.connect_status"' }
      }
      if (typeof data.page_id !== 'string') {
        return { success: false, error: 'ConnectStatus webhook requires string "data.page_id"' }
      }
      break
    }
    default:
      // Unknown event type is accepted as PancakeUnknownWebhookPayload
      break
  }

  return { success: true, event: value as unknown as PancakeWebhookPayload }
}

/**
 * Runtime validation requiring the payload to be one of the 5 documented event kinds.
 */
export function validateWebhookEvent(value: unknown): WebhookValidationResult<PancakeWebhookEvent> {
  const result = validateWebhookPayload(value)
  if (!result.success) return result
  if (!isKnownWebhookEvent(result.event)) {
    return {
      success: false,
      error: `Unknown webhook event_type: "${result.event.event_type}"`,
    }
  }
  return { success: true, event: result.event }
}

/**
 * Asserts that the value is a valid Pancake webhook payload or throws PancakeWebhookError.
 */
export function assertWebhookPayload(value: unknown): asserts value is PancakeWebhookPayload {
  const validation = validateWebhookPayload(value)
  if (!validation.success) {
    throw new PancakeWebhookError(validation.error, {
      code: 'INVALID_PAYLOAD_SHAPE',
      statusCode: 400,
    })
  }
}

/**
 * Asserts that the value is one of the 5 documented Pancake webhook events or throws PancakeWebhookError.
 */
export function assertWebhookEvent(value: unknown): asserts value is PancakeWebhookEvent {
  const validation = validateWebhookEvent(value)
  if (!validation.success) {
    throw new PancakeWebhookError(validation.error, {
      code: 'UNKNOWN_OR_INVALID_EVENT',
      statusCode: 400,
    })
  }
}
