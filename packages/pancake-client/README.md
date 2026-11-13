# pancake-client

SDK TypeScript không chính thức cho [Pancake REST API và Webhooks](https://developer.pancake.biz/). Hỗ trợ 32 HTTP operations và đầy đủ typed webhook events theo OpenAPI chính thức; không có dependency khi chạy (zero runtime dependencies).

## Cài đặt

```bash
# npm
npm install pancake-client

# pnpm
pnpm add pancake-client

# yarn
yarn add pancake-client

# bun
bun add pancake-client
```

## REST API Client

```ts
import { PancakeClient } from 'pancake-client'

const page = new PancakeClient({
  pageId: process.env.PANCAKE_PAGE_ID,
  pageAccessToken: process.env.PANCAKE_PAGE_ACCESS_TOKEN,
})

const conversations = await page.conversations.list({})
```

## Webhooks (`pancake-client/webhook`)

Package cung cấp sẵn subpath export `pancake-client/webhook` với typed payloads cho 5 loại sự kiện chính thức (`messaging`, `conversation`, `post`, `subscription`, `connect_status`), parser giữ nguyên `rawBody`/`rawPayload`, type guards/runtime validation độc lập và framework-neutral handler.

```ts
import { handleWebhookRequest } from 'pancake-client/webhook'

// Ví dụ Bun.serve hoặc Next.js App Router / Web Standard Request
export async function POST(req: Request) {
  return handleWebhookRequest(req, {
    onMessaging: async (event, { rawBody }) => {
      console.log('Tin nhắn mới:', event.data.message?.message)
    },
    onConversation: async (event) => {
      // Dùng version để đảm bảo thứ tự
      console.log('Hội thoại:', event.data.conversation.id, 'v:', event.data.conversation.version)
    },
    onConnectStatus: async (event) => {
      console.log('Trạng thái kết nối page:', event.data.connect_status)
    },
  })
}
```

Xem [README đầy đủ ở root repository](https://github.com/hi02102002/pancake-typescript-client#readme) để biết hướng dẫn chi tiết về cấu hình Pancake UI, kết nối subscription slot, phản hồi 200 nhanh và xử lý idempotency.
