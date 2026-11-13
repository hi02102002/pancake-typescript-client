import { PancakeTransport } from '../core/transport.js'
import type { MultipartBodyOf, Operation, RequestOptions, ResponseOf } from './types.js'

type UploadOp = Operation<'/pages/{page_id}/upload_contents', 'post'>
export type UploadContentFields = MultipartBodyOf<UploadOp>
export type UploadContentBody = Omit<UploadContentFields, 'file'> & { file: Blob }
export type UploadContentResponse = ResponseOf<UploadOp>

export class PageContentsApi {
  constructor(private readonly transport: PancakeTransport) {}
  upload(body: UploadContentBody, options: RequestOptions = {}): Promise<UploadContentResponse> {
    const form = new FormData()
    form.append('file', body.file)
    return this.transport.request<UploadContentResponse>({ scope: 'pageV1', method: 'POST', path: '/pages/{page_id}/upload_contents', body: form, signal: options.signal })
  }
}

