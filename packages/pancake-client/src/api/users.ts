import { PancakeTransport } from '../core/transport.js'
import type { JsonBodyOf, Operation, RequestOptions, ResponseOf } from './types.js'

type ListOp = Operation<'/pages/{page_id}/users', 'get'>
type RoundRobinOp = Operation<'/pages/{page_id}/round_robin_users', 'post'>
export type ListUsersResponse = ResponseOf<ListOp>
export type UpdateRoundRobinUsersBody = JsonBodyOf<RoundRobinOp>
export type UpdateRoundRobinUsersResponse = ResponseOf<RoundRobinOp>

export class UsersApi {
  constructor(private readonly transport: PancakeTransport) {}
  list(options: RequestOptions = {}): Promise<ListUsersResponse> {
    return this.transport.request<ListUsersResponse>({ scope: 'pageV1', method: 'GET', path: '/pages/{page_id}/users', signal: options.signal })
  }
  updateRoundRobin(body: UpdateRoundRobinUsersBody, options: RequestOptions = {}): Promise<UpdateRoundRobinUsersResponse> {
    return this.transport.request<UpdateRoundRobinUsersResponse>({ scope: 'pageV1', method: 'POST', path: '/pages/{page_id}/round_robin_users', body, signal: options.signal })
  }
}

