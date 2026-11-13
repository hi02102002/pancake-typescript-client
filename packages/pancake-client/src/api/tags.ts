import { PancakeTransport } from '../core/transport.js'
import type { Operation, RequestOptions, ResponseOf } from './types.js'

type ListOp = Operation<'/pages/{page_id}/tags', 'get'>
export type ListTagsResponse = ResponseOf<ListOp>

export class TagsApi {
  constructor(private readonly transport: PancakeTransport) {}
  list(options: RequestOptions = {}): Promise<ListTagsResponse> {
    return this.transport.request<ListTagsResponse>({ scope: 'pageV1', method: 'GET', path: '/pages/{page_id}/tags', signal: options.signal })
  }
}

