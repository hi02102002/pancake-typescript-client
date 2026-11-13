import { PancakeTransport } from '../core/transport.js'
import type { Operation, QueryOf, RequestOptions, ResponseOf } from './types.js'

type CampaignsOp = Operation<'/pages/{page_id}/statistics/pages_campaigns', 'get'>
type AdsOp = Operation<'/pages/{page_id}/statistics/ads', 'get'>
type EngagementsOp = Operation<'/pages/{page_id}/statistics/customer_engagements', 'get'>
type FeedbacksOp = Operation<'/pages/{page_id}/statistics/customer_feedbacks', 'get'>
type PagesOp = Operation<'/pages/{page_id}/statistics/pages', 'get'>
type TagsOp = Operation<'/pages/{page_id}/statistics/tags', 'get'>
type UsersOp = Operation<'/pages/{page_id}/statistics/users', 'get'>

export type PageCampaignsQuery = QueryOf<CampaignsOp>
export type PageCampaignsResponse = ResponseOf<CampaignsOp>
export type AdStatisticsQuery = QueryOf<AdsOp>
export type AdStatisticsResponse = ResponseOf<AdsOp>
export type CustomerEngagementsQuery = QueryOf<EngagementsOp>
export type CustomerEngagementsResponse = ResponseOf<EngagementsOp>
export type CustomerFeedbacksQuery = QueryOf<FeedbacksOp>
export type CustomerFeedbacksResponse = ResponseOf<FeedbacksOp>
export type PageStatisticsQuery = QueryOf<PagesOp>
export type PageStatisticsResponse = ResponseOf<PagesOp>
export type TagStatisticsQuery = QueryOf<TagsOp>
export type TagStatisticsResponse = ResponseOf<TagsOp>
export type UserStatisticsQuery = QueryOf<UsersOp>
export type UserStatisticsResponse = ResponseOf<UsersOp>

export class StatisticsApi {
  constructor(private readonly transport: PancakeTransport) {}

  pageCampaigns(query: PageCampaignsQuery, options: RequestOptions = {}): Promise<PageCampaignsResponse> { return this.get('/pages/{page_id}/statistics/pages_campaigns', query, options) }
  ads(query: AdStatisticsQuery, options: RequestOptions = {}): Promise<AdStatisticsResponse> { return this.get('/pages/{page_id}/statistics/ads', query, options) }
  customerEngagements(query: CustomerEngagementsQuery, options: RequestOptions = {}): Promise<CustomerEngagementsResponse> { return this.get('/pages/{page_id}/statistics/customer_engagements', query, options) }
  customerFeedbacks(query: CustomerFeedbacksQuery, options: RequestOptions = {}): Promise<CustomerFeedbacksResponse> { return this.get('/pages/{page_id}/statistics/customer_feedbacks', query, options) }
  pages(query: PageStatisticsQuery, options: RequestOptions = {}): Promise<PageStatisticsResponse> { return this.get('/pages/{page_id}/statistics/pages', query, options) }
  tags(query: TagStatisticsQuery, options: RequestOptions = {}): Promise<TagStatisticsResponse> { return this.get('/pages/{page_id}/statistics/tags', query, options) }
  users(query: UserStatisticsQuery, options: RequestOptions = {}): Promise<UserStatisticsResponse> { return this.get('/pages/{page_id}/statistics/users', query, options) }

  private get<T>(path: string, query: Record<string, unknown>, options: RequestOptions): Promise<T> {
    return this.transport.request<T>({ scope: 'pageV1', method: 'GET', path, query, signal: options.signal })
  }
}

