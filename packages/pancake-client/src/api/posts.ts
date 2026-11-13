import { PancakeTransport } from '../core/transport.js'
import type { Operation, QueryOf, RequestOptions, ResponseOf } from './types.js'

type ListOp = Operation<'/pages/{page_id}/posts', 'get'>
export type ListPostsQuery = QueryOf<ListOp>
export type ListPostsResponse = ResponseOf<ListOp>

export class PostsApi {
  constructor(private readonly transport: PancakeTransport) {}
  list(query: ListPostsQuery, options: RequestOptions = {}): Promise<ListPostsResponse> {
    return this.transport.request<ListPostsResponse>({ scope: 'pageV1', method: 'GET', path: '/pages/{page_id}/posts', query, signal: options.signal })
  }
  async *iterate(query: ListPostsQuery, options: RequestOptions = {}): AsyncGenerator<ListPostsResponse, void, undefined> {
    let pageNumber = query.page_number
    do {
      const response = await this.list({ ...query, page_number: pageNumber }, options)
      yield response
      const count = response.posts?.length ?? 0
      if (count < query.page_size || pageNumber * query.page_size >= (response.total ?? Infinity)) return
      pageNumber += 1
    } while (true)
  }
}

