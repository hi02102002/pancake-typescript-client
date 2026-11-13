import { PancakeTransport } from '../core/transport.js'
import type { Operation, QueryOf, RequestOptions, ResponseOf } from './types.js'

type ListOp = Operation<'/pages/{page_id}/sip_call_logs', 'get'>
export type ListCallLogsQuery = QueryOf<ListOp>
export type ListCallLogsResponse = ResponseOf<ListOp>

export class CallLogsApi {
  constructor(private readonly transport: PancakeTransport) {}

  list(query: ListCallLogsQuery, options: RequestOptions = {}): Promise<ListCallLogsResponse> {
    return this.transport.request<ListCallLogsResponse>({ scope: 'pageV1', method: 'GET', path: '/pages/{page_id}/sip_call_logs', query, signal: options.signal })
  }

  async *iterate(query: ListCallLogsQuery, options: RequestOptions = {}): AsyncGenerator<ListCallLogsResponse, void, undefined> {
    let pageNumber = query.page_number
    do {
      const response = await this.list({ ...query, page_number: pageNumber }, options)
      yield response
      if ((response.data?.length ?? 0) < query.page_size) return
      pageNumber += 1
    } while (true)
  }
}

