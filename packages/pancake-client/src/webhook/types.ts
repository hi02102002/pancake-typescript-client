import type { components } from './schema.js'

export type PancakeConversation = components['schemas']['Conversation']
export type PancakeConversationEvent = components['schemas']['ConversationEvent']
export type PancakeMessage = components['schemas']['Message']
export type PancakePost = components['schemas']['Post']
export type PancakeSubscription = components['schemas']['Subscription']
export type PancakeConnectStatus = 'connected' | 'disconnected'

export type PancakeWebhookEventType =
  | 'messaging'
  | 'conversation'
  | 'post'
  | 'subscription'
  | 'connect_status'

/**
 * Payload delivered when a new message is received or an existing message is updated in inbox/comment.
 */
export interface PancakeMessagingWebhookPayload {
  readonly page_id: string
  readonly event_type: 'messaging'
  readonly request_id?: string | undefined
  readonly timestamp?: number | undefined
  readonly data: {
    readonly conversation?: PancakeConversation | undefined
    readonly message?: PancakeMessage | undefined
    readonly post?: PancakePost | null | undefined
  }
}

/**
 * Payload delivered when a conversation is updated (assignment, tags, read/seen status, or snippet).
 */
export interface PancakeConversationWebhookPayload {
  readonly page_id: string
  readonly event_type: 'conversation'
  readonly request_id?: string | undefined
  readonly timestamp?: number | undefined
  readonly data: {
    readonly conversation: PancakeConversationEvent
  }
}

/**
 * Payload delivered whenever a post is created or when any of its fields are updated.
 */
export interface PancakePostWebhookPayload {
  readonly page_id: string
  readonly event_type: 'post'
  readonly request_id?: string | undefined
  readonly timestamp?: number | undefined
  readonly data: {
    readonly post: PancakePost
  }
}

/**
 * Payload delivered whenever there are updates related to users or pages subscribed to.
 */
export interface PancakeSubscriptionWebhookPayload {
  readonly page_id?: string | undefined
  readonly event_type: 'subscription'
  readonly request_id?: string | undefined
  readonly timestamp?: number | undefined
  readonly data: {
    readonly subscription: PancakeSubscription
  }
}

/**
 * Payload delivered when the page's connection status to the underlying platform changes.
 */
export interface PancakeConnectStatusWebhookPayload {
  readonly page_id: string
  readonly event_type: 'connect_status'
  readonly request_id?: string | undefined
  readonly timestamp?: number | undefined
  readonly data: {
    readonly connect_status: PancakeConnectStatus | (string & {})
    readonly page_id: string
  }
}

/**
 * Fallback payload for unknown or future webhook event types.
 */
export interface PancakeUnknownWebhookPayload {
  readonly page_id?: string | undefined
  readonly event_type: string
  readonly request_id?: string | undefined
  readonly timestamp?: number | undefined
  readonly data: unknown
  readonly [key: string]: unknown
}

/**
 * Discriminated union of all officially documented Pancake webhook events.
 */
export type PancakeWebhookEvent =
  | PancakeMessagingWebhookPayload
  | PancakeConversationWebhookPayload
  | PancakePostWebhookPayload
  | PancakeSubscriptionWebhookPayload
  | PancakeConnectStatusWebhookPayload

/**
 * Any valid webhook payload, including documented events and unknown forward-compatible payloads.
 */
export type PancakeWebhookPayload = PancakeWebhookEvent | PancakeUnknownWebhookPayload

/**
 * Result of parsing an incoming HTTP Request containing a Pancake webhook.
 */
export interface ParsedWebhookRequest<T extends PancakeWebhookPayload = PancakeWebhookPayload> {
  /** The strongly-typed event payload parsed from JSON. */
  readonly event: T
  /** The raw unparsed request body string for logging or auditing. */
  readonly rawBody: string
  /** The unvalidated parsed JavaScript object before type narrowing. */
  readonly rawPayload: unknown
}

/**
 * Result of runtime shape validation.
 */
export type WebhookValidationResult<T extends PancakeWebhookPayload = PancakeWebhookPayload> =
  | { readonly success: true; readonly event: T; readonly error?: never }
  | { readonly success: false; readonly event?: never; readonly error: string }

/**
 * Context passed to event handler callbacks.
 */
export interface PancakeWebhookHandlerContext<T extends PancakeWebhookPayload = PancakeWebhookPayload> {
  readonly event: T
  readonly request: Request
  readonly rawBody: string
  readonly rawPayload: unknown
}

/**
 * Context passed to the error handler callback.
 */
export interface PancakeWebhookErrorContext {
  readonly error: unknown
  readonly request: Request
  readonly rawBody?: string | undefined
  readonly rawPayload?: unknown
}

/**
 * Event handlers map for dispatching webhook events.
 */
export interface PancakeWebhookHandlers {
  readonly onMessaging?: ((
    event: PancakeMessagingWebhookPayload,
    context: PancakeWebhookHandlerContext<PancakeMessagingWebhookPayload>,
  ) => Promise<void> | void) | undefined
  readonly onConversation?: ((
    event: PancakeConversationWebhookPayload,
    context: PancakeWebhookHandlerContext<PancakeConversationWebhookPayload>,
  ) => Promise<void> | void) | undefined
  readonly onPost?: ((
    event: PancakePostWebhookPayload,
    context: PancakeWebhookHandlerContext<PancakePostWebhookPayload>,
  ) => Promise<void> | void) | undefined
  readonly onSubscription?: ((
    event: PancakeSubscriptionWebhookPayload,
    context: PancakeWebhookHandlerContext<PancakeSubscriptionWebhookPayload>,
  ) => Promise<void> | void) | undefined
  readonly onConnectStatus?: ((
    event: PancakeConnectStatusWebhookPayload,
    context: PancakeWebhookHandlerContext<PancakeConnectStatusWebhookPayload>,
  ) => Promise<void> | void) | undefined
  readonly onUnknown?: ((
    event: PancakeUnknownWebhookPayload,
    context: PancakeWebhookHandlerContext<PancakeUnknownWebhookPayload>,
  ) => Promise<void> | void) | undefined
  readonly onEvent?: ((
    event: PancakeWebhookPayload,
    context: PancakeWebhookHandlerContext<PancakeWebhookPayload>,
  ) => Promise<void> | void) | undefined
  readonly onError?: ((
    error: unknown,
    context: PancakeWebhookErrorContext,
  ) => Promise<Response | undefined> | Response | undefined) | undefined
}

/**
 * Options for `handleWebhookRequest`.
 */
export interface PancakeWebhookHandlerOptions {
  /**
   * If true (default), enforces that incoming HTTP request method is POST.
   */
  readonly strictMethod?: boolean | undefined
  /**
   * Custom acknowledgment response returned upon successful processing.
   * Defaults to HTTP 200 with `{ success: true }`.
   */
  readonly ackResponse?: Response | unknown
}
