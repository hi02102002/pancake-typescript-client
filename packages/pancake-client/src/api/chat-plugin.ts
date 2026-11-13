import { PancakeTransport } from '../core/transport.js'
import type { JsonBodyOf, Operation, QueryOf, RequestOptions, ResponseOf } from './types.js'

type GetOp = Operation<'/pke_chat_plugin/messages', 'get'>
type SendOp = Operation<'/pke_chat_plugin/messages', 'post'>
export type GetChatPluginMessagesQuery = QueryOf<GetOp>
export type GetChatPluginMessagesResponse = ResponseOf<GetOp>
export type SendChatPluginMessageBody = JsonBodyOf<SendOp>
export type SendChatPluginMessageResponse = ResponseOf<SendOp>

export class ChatPluginApi {
  constructor(private readonly transport: PancakeTransport) {}
  getMessages(query: GetChatPluginMessagesQuery, options: RequestOptions = {}): Promise<GetChatPluginMessagesResponse> {
    return this.transport.request<GetChatPluginMessagesResponse>({ scope: 'user', method: 'GET', path: '/pke_chat_plugin/messages', query, signal: options.signal })
  }
  async *iterateMessages(query: GetChatPluginMessagesQuery, options: RequestOptions = {}): AsyncGenerator<GetChatPluginMessagesResponse, void, undefined> {
    let offset = query.offset ?? 0
    do {
      const response = await this.getMessages({ ...query, offset }, options)
      yield response
      const count = response.messages?.length ?? 0
      if (count === 0) return
      offset += count
    } while (true)
  }
  sendMessage(pageId: string, body: SendChatPluginMessageBody, options: RequestOptions = {}): Promise<SendChatPluginMessageResponse> {
    return this.transport.request<SendChatPluginMessageResponse>({ scope: 'user', method: 'POST', path: '/pke_chat_plugin/messages', query: { page_id: pageId }, body, signal: options.signal })
  }
}
