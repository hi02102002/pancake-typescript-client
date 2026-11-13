import { PancakeTransport } from '../core/transport.js'
import type { Operation, QueryOf, RequestOptions, ResponseOf } from './types.js'
import { segment } from './types.js'

type ListPagesOperation = Operation<'/pages', 'get'>
type GenerateTokenOperation = Operation<'/pages/{page_id}/generate_page_access_token', 'post'>

export type ListPagesQuery = QueryOf<ListPagesOperation>
export type ListPagesResponse = ResponseOf<ListPagesOperation>
export type GeneratePageAccessTokenResponse = ResponseOf<GenerateTokenOperation>

export class PagesApi {
  constructor(private readonly transport: PancakeTransport) {}

  list(query: ListPagesQuery = {}, options: RequestOptions = {}): Promise<ListPagesResponse> {
    return this.transport.request<ListPagesResponse>({
      scope: 'user', method: 'GET', path: '/pages', query, signal: options.signal,
    })
  }

  generatePageAccessToken(
    pageId: string,
    options: RequestOptions = {},
  ): Promise<GeneratePageAccessTokenResponse> {
    return this.transport.request<GeneratePageAccessTokenResponse>({
      scope: 'user',
      method: 'POST',
      path: `/pages/${segment(pageId)}/generate_page_access_token`,
      query: { page_id: pageId },
      signal: options.signal,
    })
  }
}

