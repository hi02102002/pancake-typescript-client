import { PancakeTransport, type PancakeTransportOptions } from './core/transport.js'
import { PagesApi } from './api/pages.js'
import { ConversationsApi } from './api/conversations.js'
import { MessagesApi } from './api/messages.js'
import { StatisticsApi } from './api/statistics.js'
import { ExportDataApi } from './api/export-data.js'
import { CustomersApi } from './api/customers.js'
import { PostsApi } from './api/posts.js'
import { TagsApi } from './api/tags.js'
import { UsersApi } from './api/users.js'
import { CallLogsApi } from './api/call-logs.js'
import { PageContentsApi } from './api/page-contents.js'
import { ChatPluginApi } from './api/chat-plugin.js'

export { PancakeApiError, PancakeTransport } from './core/transport.js'
export type { PancakeTransportOptions, PancakeRequestOptions } from './core/transport.js'
export type { paths, components, operations } from './generated/schema.js'
export * from './api/pages.js'
export * from './api/conversations.js'
export * from './api/messages.js'
export * from './api/statistics.js'
export * from './api/export-data.js'
export * from './api/customers.js'
export * from './api/posts.js'
export * from './api/tags.js'
export * from './api/users.js'
export * from './api/call-logs.js'
export * from './api/page-contents.js'
export * from './api/chat-plugin.js'

/** A server-side client. Create one instance per page to keep its rate limit independent. */
export class PancakeClient {
  readonly transport: PancakeTransport
  readonly pages: PagesApi
  readonly conversations: ConversationsApi
  readonly messages: MessagesApi
  readonly statistics: StatisticsApi
  readonly exportData: ExportDataApi
  readonly customers: CustomersApi
  readonly posts: PostsApi
  readonly tags: TagsApi
  readonly users: UsersApi
  readonly callLogs: CallLogsApi
  readonly pageContents: PageContentsApi
  readonly chatPlugin: ChatPluginApi

  constructor(options: PancakeTransportOptions = {}) {
    this.transport = new PancakeTransport(options)
    this.pages = new PagesApi(this.transport)
    this.conversations = new ConversationsApi(this.transport)
    this.messages = new MessagesApi(this.transport)
    this.statistics = new StatisticsApi(this.transport)
    this.exportData = new ExportDataApi(this.transport)
    this.customers = new CustomersApi(this.transport)
    this.posts = new PostsApi(this.transport)
    this.tags = new TagsApi(this.transport)
    this.users = new UsersApi(this.transport)
    this.callLogs = new CallLogsApi(this.transport)
    this.pageContents = new PageContentsApi(this.transport)
    this.chatPlugin = new ChatPluginApi(this.transport)
  }
}
