import { PancakeTransport } from '../core/transport.js'
import type { Operation, QueryOf, RequestOptions, ResponseOf } from './types.js'

type GetAdsOp = Operation<'/pages/{page_id}/ads', 'get'>
type ExportOp = Operation<'/pages/{page_id}/export_data', 'get'>

export type GetAdsQuery = QueryOf<GetAdsOp>
export type GetAdsResponse = ResponseOf<GetAdsOp>
export type ExportDataQuery = QueryOf<ExportOp>
export type ExportDataResponse = ResponseOf<ExportOp>

export class ExportDataApi {
  constructor(private readonly transport: PancakeTransport) {}

  getAds(query: GetAdsQuery, options: RequestOptions = {}): Promise<GetAdsResponse> {
    return this.transport.request<GetAdsResponse>({ scope: 'pageV1', method: 'GET', path: '/pages/{page_id}/ads', query, signal: options.signal })
  }

  export(query: ExportDataQuery, options: RequestOptions = {}): Promise<ExportDataResponse> {
    return this.transport.request<ExportDataResponse>({ scope: 'pageV1', method: 'GET', path: '/pages/{page_id}/export_data', query, signal: options.signal })
  }

  async *iterate(query: ExportDataQuery, options: RequestOptions = {}): AsyncGenerator<ExportDataResponse, void, undefined> {
    let offset = query.offset ?? 0
    do {
      const response = await this.export({ ...query, offset }, options)
      yield response
      const count = response.data?.length ?? 0
      if (count < 60) return
      offset += count
    } while (true)
  }
}

