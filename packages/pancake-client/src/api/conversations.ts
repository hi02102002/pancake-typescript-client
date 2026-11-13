import { PancakeTransport } from '../core/transport.js'
import type { JsonBodyOf, Operation, QueryOf, RequestOptions, ResponseOf } from './types.js'
import { segment } from './types.js'

type ListOperation = Operation<'/pages/{page_id}/conversations', 'get'>
type TagsOperation = Operation<'/pages/{page_id}/conversations/{conversation_id}/tags', 'post'>
type AssignOperation = Operation<'/pages/{page_id}/conversations/{conversation_id}/assign', 'post'>
type ReadOperation = Operation<'/pages/{page_id}/conversations/{conversation_id}/read', 'post'>
type UnreadOperation = Operation<'/pages/{page_id}/conversations/{conversation_id}/unread', 'post'>

export type ListConversationsQuery = QueryOf<ListOperation>
export type ListConversationsResponse = ResponseOf<ListOperation>
export type UpdateConversationTagsBody = JsonBodyOf<TagsOperation>
export type UpdateConversationTagsResponse = ResponseOf<TagsOperation>
export type AssignConversationBody = JsonBodyOf<AssignOperation>
export type AssignConversationResponse = ResponseOf<AssignOperation>
export type MarkConversationReadResponse = ResponseOf<ReadOperation>
export type MarkConversationUnreadResponse = ResponseOf<UnreadOperation>

export class ConversationsApi {
  constructor(private readonly transport: PancakeTransport) {}

  list(query: ListConversationsQuery = {}, options: RequestOptions = {}): Promise<ListConversationsResponse> {
    return this.transport.request<ListConversationsResponse>({
      scope: 'pageV2', method: 'GET', path: '/pages/{page_id}/conversations', query, signal: options.signal,
    })
  }

  async *iterate(
    query: ListConversationsQuery = {},
    options: RequestOptions = {},
  ): AsyncGenerator<ListConversationsResponse, void, undefined> {
    let cursor = query.last_conversation_id
    do {
      const pageQuery = cursor === undefined ? query : { ...query, last_conversation_id: cursor }
      const response = await this.list(pageQuery, options)
      yield response
      const conversations = response.conversations ?? []
      const next = conversations.at(-1)?.id
      if (conversations.length === 0 || next === undefined || next === cursor) return
      cursor = next
    } while (true)
  }

  updateTags(conversationId: string, body: UpdateConversationTagsBody, options: RequestOptions = {}): Promise<UpdateConversationTagsResponse> {
    return this.transport.request<UpdateConversationTagsResponse>({ scope: 'pageV1', method: 'POST', path: this.path(conversationId, 'tags'), body, signal: options.signal })
  }

  assign(conversationId: string, body: AssignConversationBody, options: RequestOptions = {}): Promise<AssignConversationResponse> {
    return this.transport.request<AssignConversationResponse>({ scope: 'pageV1', method: 'POST', path: this.path(conversationId, 'assign'), body, signal: options.signal })
  }

  markRead(conversationId: string, options: RequestOptions = {}): Promise<MarkConversationReadResponse> {
    return this.transport.request<MarkConversationReadResponse>({ scope: 'pageV1', method: 'POST', path: this.path(conversationId, 'read'), signal: options.signal })
  }

  markUnread(conversationId: string, options: RequestOptions = {}): Promise<MarkConversationUnreadResponse> {
    return this.transport.request<MarkConversationUnreadResponse>({ scope: 'pageV1', method: 'POST', path: this.path(conversationId, 'unread'), signal: options.signal })
  }

  private path(conversationId: string, action: string): string {
    return `/pages/{page_id}/conversations/${segment(conversationId)}/${action}`
  }
}

