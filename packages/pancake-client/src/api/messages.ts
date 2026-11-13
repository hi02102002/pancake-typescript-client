import { PancakeTransport } from '../core/transport.js'
import type { JsonBodyOf, Operation, QueryOf, RequestOptions, ResponseOf } from './types.js'
import { segment } from './types.js'

type GetOperation = Operation<'/pages/{page_id}/conversations/{conversation_id}/messages', 'get'>
type SendOperation = Operation<'/pages/{page_id}/conversations/{conversation_id}/messages', 'post'>

export type GetMessagesQuery = QueryOf<GetOperation>
export type GetMessagesResponse = ResponseOf<GetOperation>
export type SendMessageBody = JsonBodyOf<SendOperation>
export type SendMessageResponse = ResponseOf<SendOperation>

export class MessagesApi {
  constructor(private readonly transport: PancakeTransport) {}

  get(conversationId: string, query: GetMessagesQuery = {}, options: RequestOptions = {}): Promise<GetMessagesResponse> {
    return this.transport.request<GetMessagesResponse>({ scope: 'pageV1', method: 'GET', path: this.path(conversationId), query, signal: options.signal })
  }

  async *iterate(conversationId: string, query: GetMessagesQuery = {}, options: RequestOptions = {}): AsyncGenerator<GetMessagesResponse, void, undefined> {
    let currentCount = query.current_count ?? 0
    do {
      const response = await this.get(conversationId, { ...query, current_count: currentCount }, options)
      yield response
      const count = response.messages?.length ?? 0
      if (count === 0) return
      currentCount += count
    } while (true)
  }

  send(conversationId: string, body: SendMessageBody, options: RequestOptions = {}): Promise<SendMessageResponse> {
    return this.transport.request<SendMessageResponse>({ scope: 'pageV1', method: 'POST', path: this.path(conversationId), body, signal: options.signal })
  }

  private path(conversationId: string): string {
    return `/pages/{page_id}/conversations/${segment(conversationId)}/messages`
  }
}
