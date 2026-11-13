import { describe, expect, test } from 'bun:test'
import {
  PancakeWebhookError,
  assertWebhookEvent,
  assertWebhookPayload,
  createWebhookAckResponse,
  handleWebhookRequest,
  isConnectStatusWebhookPayload,
  isConversationWebhookPayload,
  isKnownWebhookEvent,
  isMessagingWebhookPayload,
  isPostWebhookPayload,
  isSubscriptionWebhookPayload,
  isWebhookPayload,
  parseWebhookPayload,
  parseWebhookRequest,
  validateWebhookEvent,
  validateWebhookPayload,
  type PancakeConversationWebhookPayload,
  type PancakeWebhookPayload,
} from '../src/webhook/index.js'

// Official examples from developer.pancake.biz OpenAPI specification
const messagingSample = {
  page_id: 'tt_6711731671916708866',
  event_type: 'messaging',
  data: {
    conversation: {
      id: 'tt_0:1:6570511458700967938:6711731671916708866',
      assignee_ids: ['62fdbc48-2ad5-4711-9a74-943ca3638386'],
      from: {
        id: 'tt_6570511458700967938',
        name: 'Jineo',
      },
      is_combined: false,
      is_removed: false,
      is_replied: false,
      read_watermarks: null,
      seen: false,
      snippet: 'alo abc',
      tags: [],
      type: 'INBOX',
    },
    message: {
      id: 'tt_7452304119832249857',
      conversation_id: 'tt_0:1:6570511458700967938:6711731671916708866',
      page_id: 'tt_6711731671916708866',
      message: 'alo abc',
      original_message: 'alo abc',
      rich_message: null,
      type: 'INBOX',
      inserted_at: '2024-12-25T11:06:07.000000',
      from: {
        id: 'tt_6570511458700967938',
        name: 'Jineo',
        page_customer_id: 'ddc7b38d-e23a-4bf6-8151-5bfc46105839',
      },
      attachments: [],
      has_phone: false,
      phone_info: [],
      is_hidden: false,
      is_parent: false,
      is_parent_hidden: false,
      is_removed: false,
      like_count: null,
      user_likes: false,
      edit_history: null,
      parent_id: null,
      private_reply_conversation: null,
      removed_by: null,
      show_info: true,
      can_comment: false,
      can_hide: false,
      can_like: false,
      can_remove: false,
      can_reply_privately: false,
    },
    post: null,
  },
} as const

const conversationSample = {
  event_type: 'conversation',
  page_id: '100000000000001',
  request_id: '6d536a7a-0000-0000-0000-000000000000',
  timestamp: 1784255208,
  data: {
    conversation: {
      id: '100000000000001_100000000000002',
      assignee_ids: ['22222222-2222-2222-2222-222222222222'],
      customer_id: '11111111-1111-1111-1111-111111111111',
      from: {
        email: '100000000000002@facebook.com',
        id: '100000000000002',
        name: 'John Doe',
      },
      is_combined: false,
      is_removed: false,
      is_replied: false,
      read_watermarks: [
        {
          is_group_conv: null,
          message_id: 'm_00000000000000000000000000000000',
          psid: '100000000000002',
          watermark: 1782552309,
        },
      ],
      seen: true,
      snippet: '0900000000',
      tags: [2, 3, 4],
      type: 'INBOX',
      version: 306,
    },
  },
} as const

const postSample = {
  event_type: 'post',
  page_id: '102816772637000',
  data: {
    post: {
      admin_creator: null,
      attachments: {
        data: [
          {
            description: null,
            media: {
              image: {
                height: 720,
                width: 720,
              },
            },
            target: {
              id: '128718770046800',
              url: 'https://www.facebook.com/1028167.103448482573829/128718770046800/',
            },
            title: null,
            type: 'photo',
          },
        ],
        ids: ['128718770046800'],
      },
      from: {
        id: '102816772637000',
        name: 'Nước gạo rang',
      },
      id: '102816772637000_128718810046796',
      inserted_at: '2022-12-15T04:02:01',
      message: 'GẠO LỨT ĐỎ CHO CƠ THỂ KHỎE MẠNH',
      story: null,
      type: 'livestream',
    },
  },
} as const

const subscriptionSample = {
  event_type: 'subscription',
  data: {
    subscription: {
      accumulated_amount: 20253900000,
      activated_at: '2024-11-26T03:08:51',
      auto_config: false,
      currency: 'VND',
      duration: 6,
      expired_at: '2025-05-25T03:08:48',
      id: 'A12SDA',
      inserted_at: '2024-11-26T03:08:51',
      is_activated: true,
      is_paid: true,
      owner_id: '6a00ea1f-af2c-4e3e-8f96-46ed462e2243',
      page_count: 120,
      page_ids: ['In_1660919956', 'tl_6791248854'],
      payment_amount: 20253900000,
      shared_accounts: ['696cd302-206f-4788-adc3-16f29ddcb646'],
      type: 'pancake',
      upgrade_from: null,
      user_count: 400,
      user_ids: [
        '27f0fa6f-4ae4-4d87-b2a4-4f3ff997af6f',
        '6a00ea1f-af2c-4e3e-8f96-46ed462e2243',
      ],
    },
  },
} as const

const connectStatusSample = {
  event_type: 'connect_status',
  page_id: '100000000000001',
  request_id: '792aab1b-0000-0000-0000-000000000000',
  timestamp: 1784255157,
  data: {
    connect_status: 'disconnected',
    page_id: '100000000000001',
  },
} as const

describe('Pancake Webhook Payload Types and Guards', () => {
  test('correctly identifies and validates messaging sample', () => {
    expect(isWebhookPayload(messagingSample)).toBe(true)
    expect(isKnownWebhookEvent(messagingSample)).toBe(true)
    expect(isMessagingWebhookPayload(messagingSample as PancakeWebhookPayload)).toBe(true)
    expect(isConversationWebhookPayload(messagingSample as PancakeWebhookPayload)).toBe(false)

    const validated = validateWebhookPayload(messagingSample)
    expect(validated.success).toBe(true)
    if (validated.success) {
      expect(validated.event.event_type).toBe('messaging')
      expect(validated.event.page_id).toBe('tt_6711731671916708866')
    }
  })

  test('correctly identifies and validates conversation sample', () => {
    expect(isWebhookPayload(conversationSample)).toBe(true)
    expect(isKnownWebhookEvent(conversationSample)).toBe(true)
    expect(isConversationWebhookPayload(conversationSample as PancakeWebhookPayload)).toBe(true)
    expect(isMessagingWebhookPayload(conversationSample as PancakeWebhookPayload)).toBe(false)

    const validated = validateWebhookEvent(conversationSample)
    expect(validated.success).toBe(true)
    if (validated.success && isConversationWebhookPayload(validated.event)) {
      expect(validated.event.event_type).toBe('conversation')
      expect(validated.event.request_id).toBe('6d536a7a-0000-0000-0000-000000000000')
      expect(validated.event.data.conversation.version).toBe(306)
    }
  })

  test('correctly identifies and validates post sample', () => {
    expect(isWebhookPayload(postSample)).toBe(true)
    expect(isKnownWebhookEvent(postSample)).toBe(true)
    expect(isPostWebhookPayload(postSample as PancakeWebhookPayload)).toBe(true)

    const validated = validateWebhookEvent(postSample)
    expect(validated.success).toBe(true)
    if (validated.success && isPostWebhookPayload(validated.event)) {
      expect(validated.event.data.post?.id).toBe('102816772637000_128718810046796')
    }
  })

  test('correctly identifies and validates subscription sample', () => {
    expect(isWebhookPayload(subscriptionSample)).toBe(true)
    expect(isKnownWebhookEvent(subscriptionSample)).toBe(true)
    expect(isSubscriptionWebhookPayload(subscriptionSample as PancakeWebhookPayload)).toBe(true)

    const validated = validateWebhookEvent(subscriptionSample)
    expect(validated.success).toBe(true)
    if (validated.success && isSubscriptionWebhookPayload(validated.event)) {
      expect(validated.event.data.subscription.currency).toBe('VND')
    }
  })

  test('correctly identifies and validates connect_status sample', () => {
    expect(isWebhookPayload(connectStatusSample)).toBe(true)
    expect(isKnownWebhookEvent(connectStatusSample)).toBe(true)
    expect(isConnectStatusWebhookPayload(connectStatusSample as PancakeWebhookPayload)).toBe(true)

    const validated = validateWebhookEvent(connectStatusSample)
    expect(validated.success).toBe(true)
    if (validated.success && isConnectStatusWebhookPayload(validated.event)) {
      expect(validated.event.data.connect_status).toBe('disconnected')
    }
  })

  test('supports unknown event types in PancakeWebhookPayload without crashing', () => {
    const customPayload = {
      event_type: 'future_order_status',
      page_id: 'page_999',
      data: { order_id: 123 },
    }
    expect(isWebhookPayload(customPayload)).toBe(true)
    expect(isKnownWebhookEvent(customPayload)).toBe(false)

    const payloadResult = validateWebhookPayload(customPayload)
    expect(payloadResult.success).toBe(true)

    const eventResult = validateWebhookEvent(customPayload)
    expect(eventResult.success).toBe(false)
    if (!eventResult.success) {
      expect(eventResult.error).toContain('future_order_status')
    }
  })

  test('distinguishes invalid shape from valid payloads', () => {
    expect(validateWebhookPayload(null).success).toBe(false)
    expect(validateWebhookPayload('string').success).toBe(false)
    expect(validateWebhookPayload({}).success).toBe(false)
    expect(validateWebhookPayload({ event_type: 'messaging' }).success).toBe(false)
    expect(validateWebhookPayload({ event_type: 'messaging', data: null }).success).toBe(false)
    expect(
      validateWebhookPayload({ event_type: 'messaging', data: {}, page_id: 123 }).success,
    ).toBe(false)

    expect(() => assertWebhookPayload(null)).toThrow(PancakeWebhookError)
    expect(() => assertWebhookEvent({ event_type: 'non_existent', data: {} })).toThrow(
      PancakeWebhookError,
    )
  })
})

describe('Pancake Webhook Parser', () => {
  test('parseWebhookPayload parses both raw JSON string and parsed object', () => {
    const jsonString = JSON.stringify(messagingSample)
    const parsedFromString = parseWebhookPayload(jsonString)
    expect(parsedFromString.event_type).toBe('messaging')

    const parsedFromObj = parseWebhookPayload(messagingSample)
    expect(parsedFromObj.event_type).toBe('messaging')
  })

  test('parseWebhookPayload throws PancakeWebhookError on invalid JSON', () => {
    expect(() => parseWebhookPayload('{ invalid json')).toThrow(PancakeWebhookError)
    try {
      parseWebhookPayload('{ invalid json')
    } catch (err) {
      expect(err).toBeInstanceOf(PancakeWebhookError)
      expect((err as PancakeWebhookError).code).toBe('INVALID_JSON')
      expect((err as PancakeWebhookError).statusCode).toBe(400)
    }
  })

  test('parseWebhookRequest preserves rawBody, rawPayload, and returns typed event', async () => {
    const rawBody = JSON.stringify(conversationSample)
    const request = new Request('https://my-app.com/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: rawBody,
    })

    const parsed = await parseWebhookRequest<PancakeConversationWebhookPayload>(request)
    expect(parsed.rawBody).toBe(rawBody)
    expect(parsed.rawPayload).toEqual(conversationSample)
    expect(parsed.event.event_type).toBe('conversation')
    expect(parsed.event.page_id).toBe('100000000000001')
    expect(parsed.event.data.conversation.id).toBe('100000000000001_100000000000002')
  })

  test('parseWebhookRequest enforces HTTP POST method by default', async () => {
    const request = new Request('https://my-app.com/webhook', {
      method: 'GET',
    })

    await expect(parseWebhookRequest(request)).rejects.toThrow(PancakeWebhookError)
    try {
      await parseWebhookRequest(request)
    } catch (err) {
      expect((err as PancakeWebhookError).code).toBe('INVALID_METHOD')
      expect((err as PancakeWebhookError).statusCode).toBe(405)
    }
  })

  test('parseWebhookRequest allows non-POST when strictMethod is false', async () => {
    const rawBody = JSON.stringify(messagingSample)
    const request = new Request('https://my-app.com/webhook', {
      method: 'PUT',
      body: rawBody,
    })

    const parsed = await parseWebhookRequest(request, { strictMethod: false })
    expect(parsed.event.event_type).toBe('messaging')
  })
})

describe('createWebhookAckResponse', () => {
  test('returns HTTP 200 with JSON content type and default body', async () => {
    const response = createWebhookAckResponse()
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/json')
    const json = await response.json()
    expect(json).toEqual({ success: true })
  })

  test('supports custom body and init options', async () => {
    const response = createWebhookAckResponse({ status: 'ok', received: true }, {
      headers: { 'X-Custom-Header': '1' },
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('x-custom-header')).toBe('1')
    const json = await response.json()
    expect(json).toEqual({ status: 'ok', received: true })
  })
})

describe('handleWebhookRequest Framework-Neutral Handler', () => {
  test('dispatches messaging event to onMessaging and onEvent', async () => {
    let messagingDispatched = false
    let eventDispatched = false
    let rawBodyPreserved = false

    const request = new Request('https://example.com/api/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messagingSample),
    })

    const response = await handleWebhookRequest(request, {
      onMessaging: async (event, context) => {
        messagingDispatched = true
        expect(event.data.message?.message).toBe('alo abc')
        expect(context.rawBody).toContain('tt_6711731671916708866')
        rawBodyPreserved = true
      },
      onConversation: () => {
        throw new Error('Should not call onConversation')
      },
      onEvent: (event) => {
        eventDispatched = true
        expect(event.event_type).toBe('messaging')
      },
    })

    expect(response.status).toBe(200)
    expect(messagingDispatched).toBe(true)
    expect(eventDispatched).toBe(true)
    expect(rawBodyPreserved).toBe(true)
  })

  test('dispatches conversation event and enables version-based idempotency check', async () => {
    let processedVersion = 0
    let lastRequestId: string | undefined

    const request = new Request('https://example.com/api/webhook', {
      method: 'POST',
      body: JSON.stringify(conversationSample),
    })

    const response = await handleWebhookRequest(request, {
      onConversation: async (event) => {
        lastRequestId = event.request_id
        const incomingVersion = event.data.conversation.version ?? 0
        if (incomingVersion > processedVersion) {
          processedVersion = incomingVersion
        }
      },
    })

    expect(response.status).toBe(200)
    expect(lastRequestId).toBe('6d536a7a-0000-0000-0000-000000000000')
    expect(processedVersion).toBe(306)
  })

  test('dispatches post, subscription, and connect_status events', async () => {
    let postSeen = false
    let subSeen = false
    let connectSeen = false

    // Post
    await handleWebhookRequest(
      new Request('https://example.com/webhook', {
        method: 'POST',
        body: JSON.stringify(postSample),
      }),
      {
        onPost: (event) => {
          postSeen = true
          expect(event.data.post?.type).toBe('livestream')
        },
      },
    )
    expect(postSeen).toBe(true)

    // Subscription
    await handleWebhookRequest(
      new Request('https://example.com/webhook', {
        method: 'POST',
        body: JSON.stringify(subscriptionSample),
      }),
      {
        onSubscription: (event) => {
          subSeen = true
          expect(event.data.subscription.currency).toBe('VND')
        },
      },
    )
    expect(subSeen).toBe(true)

    // Connect Status
    await handleWebhookRequest(
      new Request('https://example.com/webhook', {
        method: 'POST',
        body: JSON.stringify(connectStatusSample),
      }),
      {
        onConnectStatus: (event) => {
          connectSeen = true
          expect(event.data.connect_status).toBe('disconnected')
        },
      },
    )
    expect(connectSeen).toBe(true)
  })

  test('dispatches unknown event to onUnknown handler', async () => {
    let unknownSeen = false
    const unknownSample = {
      event_type: 'custom_ping',
      page_id: 'page_1',
      data: { ping: true },
    }

    const response = await handleWebhookRequest(
      new Request('https://example.com/webhook', {
        method: 'POST',
        body: JSON.stringify(unknownSample),
      }),
      {
        onUnknown: (event) => {
          unknownSeen = true
          expect(event.event_type).toBe('custom_ping')
        },
      },
    )

    expect(response.status).toBe(200)
    expect(unknownSeen).toBe(true)
  })

  test('handles bad request method and returns HTTP 405', async () => {
    const request = new Request('https://example.com/webhook', {
      method: 'GET',
    })

    const response = await handleWebhookRequest(request)
    expect(response.status).toBe(405)
    const json = (await response.json()) as { code: string }
    expect(json.code).toBe('INVALID_METHOD')
  })

  test('handles malformed body and calls custom onError handler if provided', async () => {
    let errorIntercepted = false
    const request = new Request('https://example.com/webhook', {
      method: 'POST',
      body: 'invalid-json',
    })

    const response = await handleWebhookRequest(
      request,
      {},
      {
        ackResponse: { ok: true },
      },
    )
    expect(response.status).toBe(400)

    // With onError providing custom response
    const request2 = new Request('https://example.com/webhook', {
      method: 'POST',
      body: 'invalid-json',
    })
    const response2 = await handleWebhookRequest(request2, {
      onError: (_err) => {
        errorIntercepted = true
        return new Response(JSON.stringify({ custom_error: true }), {
          status: 422,
          headers: { 'Content-Type': 'application/json' },
        })
      },
    })
    expect(errorIntercepted).toBe(true)
    expect(response2.status).toBe(422)
  })

  test('Pancake UI verify endpoint returns HTTP 200 without requiring auth headers', async () => {
    // When Pancake UI verifies an endpoint URL, it sends a standard POST request.
    // Since official Pancake docs specify no secret token or signature header,
    // the endpoint accepts valid POST requests and responds with HTTP 200.
    const verifyRequest = new Request('https://my-domain.com/api/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messagingSample),
    })

    const response = await handleWebhookRequest(verifyRequest)
    expect(response.status).toBe(200)
  })
})
