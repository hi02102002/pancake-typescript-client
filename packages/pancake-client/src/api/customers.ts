import { PancakeTransport } from '../core/transport.js'
import type { JsonBodyOf, Operation, QueryOf, RequestOptions, ResponseOf } from './types.js'
import { segment } from './types.js'

type ListOp = Operation<'/pages/{page_id}/page_customers', 'get'>
type UpdateOp = Operation<'/pages/{page_id}/page_customers/{page_customer_id}', 'put'>
type AvatarOp = Operation<'/pages/{page_id}/avatar/{psid}', 'get'>
type AddNoteOp = Operation<'/pages/{page_id}/page_customers/{page_customer_id}/notes', 'post'>
type UpdateNoteOp = Operation<'/pages/{page_id}/page_customers/{page_customer_id}/notes', 'put'>
type DeleteNoteOp = Operation<'/pages/{page_id}/page_customers/{page_customer_id}/notes', 'delete'>

export type ListCustomersQuery = QueryOf<ListOp>
export type ListCustomersResponse = ResponseOf<ListOp>
export type UpdateCustomerBody = JsonBodyOf<UpdateOp>
export type UpdateCustomerResponse = ResponseOf<UpdateOp>
export type GetAvatarResponse = ResponseOf<AvatarOp>
export type AddCustomerNoteBody = JsonBodyOf<AddNoteOp>
export type AddCustomerNoteResponse = ResponseOf<AddNoteOp>
export type UpdateCustomerNoteBody = JsonBodyOf<UpdateNoteOp>
export type UpdateCustomerNoteResponse = ResponseOf<UpdateNoteOp>
export type DeleteCustomerNoteBody = JsonBodyOf<DeleteNoteOp>
export type DeleteCustomerNoteResponse = ResponseOf<DeleteNoteOp>

export class CustomersApi {
  constructor(private readonly transport: PancakeTransport) {}

  list(query: ListCustomersQuery, options: RequestOptions = {}): Promise<ListCustomersResponse> {
    return this.transport.request<ListCustomersResponse>({ scope: 'pageV1', method: 'GET', path: '/pages/{page_id}/page_customers', query, signal: options.signal })
  }

  async *iterate(query: ListCustomersQuery, options: RequestOptions = {}): AsyncGenerator<ListCustomersResponse, void, undefined> {
    let pageNumber = query.page_number
    do {
      const response = await this.list({ ...query, page_number: pageNumber }, options)
      yield response
      const count = response.customers?.length ?? 0
      const pageSize = query.page_size ?? count
      if (count === 0 || count < pageSize || pageNumber * pageSize >= (response.total ?? Infinity)) return
      pageNumber += 1
    } while (true)
  }

  update(pageCustomerId: string, body: UpdateCustomerBody, options: RequestOptions = {}): Promise<UpdateCustomerResponse> {
    return this.transport.request<UpdateCustomerResponse>({ scope: 'pageV1', method: 'PUT', path: this.customerPath(pageCustomerId), body, signal: options.signal })
  }

  getAvatar(pageId: string, psid: string, options: RequestOptions = {}): Promise<GetAvatarResponse> {
    return this.transport.request<GetAvatarResponse>({ scope: 'user', method: 'GET', path: `/pages/${segment(pageId)}/avatar/${segment(psid)}`, signal: options.signal, responseType: 'blob', auth: false })
  }

  addNote(pageCustomerId: string, body: AddCustomerNoteBody, options: RequestOptions = {}): Promise<AddCustomerNoteResponse> { return this.noteRequest('POST', pageCustomerId, body, options) }
  updateNote(pageCustomerId: string, body: UpdateCustomerNoteBody, options: RequestOptions = {}): Promise<UpdateCustomerNoteResponse> { return this.noteRequest('PUT', pageCustomerId, body, options) }
  deleteNote(pageCustomerId: string, body: DeleteCustomerNoteBody, options: RequestOptions = {}): Promise<DeleteCustomerNoteResponse> { return this.noteRequest('DELETE', pageCustomerId, body, options) }

  private customerPath(id: string): string { return `/pages/{page_id}/page_customers/${segment(id)}` }
  private noteRequest<T>(method: string, id: string, body: unknown, options: RequestOptions): Promise<T> {
    return this.transport.request<T>({ scope: 'pageV1', method, path: `${this.customerPath(id)}/notes`, body, signal: options.signal })
  }
}
