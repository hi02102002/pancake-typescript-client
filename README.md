# Pancake TypeScript Client

SDK TypeScript **không chính thức** cho [Pancake REST API và Webhooks](https://developer.pancake.biz/). Package bao phủ 32 HTTP operations trong OpenAPI REST và đầy đủ typed webhook events theo OpenAPI Webhook chính thức.

## Yêu cầu

- Node.js 22+ hoặc Bun
- Bun để cài dependencies và build từ mã nguồn

## Cài đặt

Cài đặt package vào dự án của bạn:

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

Bản phát hành chính thức có sẵn trên [npm](https://www.npmjs.com/package/pancake-client). Package hoạt động với Node.js 22+ và Bun, không có dependency khi chạy (zero runtime dependencies).

## Phát triển từ mã nguồn

```bash
git clone https://github.com/hi02102002/pancake-typescript-client.git
cd pancake-typescript-client
bun install
bun run check
bun test
bun run build
```

Package nằm ở `packages/pancake-client`. Bản build ESM và TypeScript declarations nằm trong `packages/pancake-client/dist`.

## Sử dụng REST API Client

```ts
import { PancakeClient } from 'pancake-client'

// API cấp tài khoản: dùng User Access Token.
const account = new PancakeClient({ accessToken: process.env.PANCAKE_ACCESS_TOKEN })
const pages = await account.pages.list()

// API cấp page: dùng Page Access Token của đúng page.
const page = new PancakeClient({
  pageId: process.env.PANCAKE_PAGE_ID,
  pageAccessToken: process.env.PANCAKE_PAGE_ACCESS_TOKEN,
})
const conversations = await page.conversations.list({})

// Iterator yield response của từng trang.
for await (const response of page.conversations.iterate({})) {
  console.log(response.conversations)
}
```

Trong repo này, package được khai báo là Bun workspace. Để dùng trong ứng dụng khác, chạy `bun add pancake-client` hoặc `npm install pancake-client`.

## Webhooks (`pancake-client/webhook`)

Package cung cấp subpath export `pancake-client/webhook` để tiếp nhận và xử lý HTTP POST webhook từ Pancake với zero runtime dependencies.

### Các loại sự kiện được hỗ trợ

| Event | Mô tả |
| --- | --- |
| `messaging` | Kích hoạt khi có tin nhắn mới hoặc tin nhắn được cập nhật trong inbox hoặc comment |
| `conversation` | Kích hoạt khi hội thoại thay đổi (phân công staff, đổi tags, xem tin nhắn, cập nhật snippet) |
| `post` | Kích hoạt khi bài viết được tạo mới hoặc cập nhật bất kỳ trường thông tin nào |
| `subscription` | Thông báo thay đổi liên quan đến người dùng hoặc các page được đăng ký gói |
| `connect_status` | Kích hoạt khi trạng thái kết nối page tới nền tảng thay đổi (`connected` / `disconnected`) |

### Thiết lập trong giao diện Pancake UI

1. **Yêu cầu Connection Slot trong Subscription**: Mỗi page kích hoạt Webhook tiêu tốn thêm **1 connection slot** trong gói đăng ký Pancake của bạn. Trước khi bật, hãy vào phần **Subscription settings** kiểm tra số slot còn trống; nếu thiếu cần nâng cấp gói hoặc mua thêm connection slot trước.
2. **Cấu hình Webhook URL**: Đăng nhập Pancake, truy cập Cài đặt công cụ của Page (cần quyền admin) -> **Webhook Settings**.
3. **HTTPS & Public URL**: Nhập URL endpoint công khai dạng **HTTPS** của bạn (ví dụ triển khai qua server công khai hoặc dùng Cloudflare Tunnel / ngrok khi test local).
4. **Xác nhận (Verify)**: Bấm **Verify** trong giao diện Pancake và đảm bảo endpoint trả HTTP 200 cho request webhook hợp lệ. Tài liệu không mô tả một cơ chế xác thực chữ ký riêng cho bước này.
5. **Kích hoạt (Enable)**: Lưu và bật webhook.

### Phản hồi HTTP 200 nhanh & Cơ chế tự động ngưng (Suspension)

- Pancake yêu cầu endpoint trả về mã HTTP `200` nhanh chóng (khuyến nghị dưới 5 giây) để xác nhận đã nhận sự kiện.
- `handleWebhookRequest` chờ các callback hoàn tất rồi mới trả HTTP 200. Callback nên chỉ ghi sự kiện vào queue bền vững và trả nhanh; xử lý nặng thực hiện ở worker riêng.
- **Tự động ngưng gửi sự kiện**: Nếu trong vòng 30 phút, tỷ lệ lỗi của endpoint vượt quá 80% VÀ có từ 300 request lỗi trở lên (mã lỗi ngoài 2xx, timeout, hoặc ngắt kết nối), Pancake sẽ **tự động tạm ngưng** gửi webhook.
- **Cách bật lại**: Khắc phục lỗi ở endpoint để phản hồi HTTP 200, sau đó đăng nhập Pancake -> Webhook Settings -> Bật lại webhook.

### Idempotency & Thứ tự phân phối sự kiện

- Sự kiện có thể được gửi lại khi gặp sự cố mạng tạm thời. Dùng `request_id` (có trong `conversation`, `connect_status`) để ghi log và deduplicate.
- Đối với sự kiện `conversation`, Pancake gửi kèm trường số nguyên tăng dần `data.conversation.version`. Chỉ áp dụng cập nhật khi `version` mới lớn hơn `version` đã xử lý gần nhất của hội thoại đó để loại bỏ các sự kiện gửi lệch thứ tự.

### Cơ chế xác thực & Bảo mật

- Theo tài liệu chính thức của Pancake ([developer.pancake.biz/openapi/webhook.yaml](https://developer.pancake.biz/openapi/webhook.yaml)), Pancake **không** đính kèm secret header hay chữ ký HMAC trong webhook request. Thư viện tuân thủ chuẩn tài liệu và không tự tạo cơ chế xác thực giả định.
- Để tăng cường bảo mật trong môi trường production, hãy sử dụng đường dẫn URL riêng tư/ngẫu nhiên (ví dụ `/api/webhook/pancake-9a8f2c...`), cấu hình HTTPS, và kiểm soát quyền truy cập qua reverse proxy / firewall nếu cần.

### Phân tách Typed Shape và Runtime Validation

- **Typed Shape**: Các interface TypeScript (`PancakeMessagingWebhookPayload`, `PancakeConversationWebhookPayload`, ...) giúp kiểm tra kiểu lúc viết mã.
- **Runtime Validation**: Cung cấp hàm `validateWebhookPayload()`, `validateWebhookEvent()`, `assertWebhookPayload()`, cùng các type guard (`isMessagingWebhookPayload()`, `isConversationWebhookPayload()`, ...) để kiểm tra dữ liệu thực tế lúc chạy mà không cần thư viện bên ngoài.
- **Bảo toàn dữ liệu thô**: Các tiện ích parse giữ nguyên `rawBody` (chuỗi ký tự ban đầu) và `rawPayload` (object ban đầu) để phục vụ việc ghi nhật ký hoặc kiểm tra mở rộng.

### Ví dụ tiếp nhận Webhook

#### 1. Sử dụng `handleWebhookRequest` (Khuyên dùng - Framework-neutral)

Tương thích với Bun (`Bun.serve`), Next.js App Router (`route.ts`), Hono, Cloudflare Workers:

```ts
import { handleWebhookRequest } from 'pancake-client/webhook'

// Ví dụ Bun.serve
Bun.serve({
  port: 3000,
  async fetch(req) {
    if (req.method === 'POST' && new URL(req.url).pathname === '/webhook') {
      return handleWebhookRequest(req, {
        onMessaging: async (event, { rawBody }) => {
          console.log(`[${event.page_id}] Tin nhắn mới:`, event.data.message?.message)
        },
        onConversation: async (event) => {
          console.log(`Hội thoại ${event.data.conversation.id} version: ${event.data.conversation.version}`)
        },
        onConnectStatus: async (event) => {
          console.log(`Trạng thái page ${event.data.page_id}: ${event.data.connect_status}`)
        },
      })
    }
    return new Response('Not Found', { status: 404 })
  },
})
```

#### 2. Sử dụng với Node.js `node:http`

```ts
import { createServer } from 'node:http'
import { parseWebhookPayload } from 'pancake-client/webhook'

const server = createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/webhook') {
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(chunk)
    const rawBody = Buffer.concat(chunks).toString('utf8')

    try {
      const event = parseWebhookPayload(rawBody)
      console.log('Đã nhận sự kiện Pancake:', event.event_type)

      // Phản hồi HTTP 200 nhanh
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true }))
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: (err as Error).message }))
    }
    return
  }

  res.writeHead(404).end()
})

server.listen(3000, () => console.log('Webhook server running on port 3000'))
```

## Cấu hình REST Client

| Thuộc tính | Tác dụng | Mặc định |
| --- | --- | --- |
| `accessToken` | Token cho API cấp tài khoản | Không có |
| `pageId` và `pageAccessToken` | ID và token cho API cấp page | Không có |
| `timeoutMs` | Timeout cho mỗi lần gửi request | `30000` ms |
| `maxRetries` | Số lần thử thêm cho GET | `3` |
| `rateLimit` | Giãn các request cấp page của cùng instance cách nhau ít nhất 200 ms | `true` |
| `fetch` | Hàm `fetch` tùy chỉnh, hữu ích khi test | `globalThis.fetch` |
| `baseUrls` | Đổi URL gốc của API tài khoản, page v1/v2 | URL chính thức |

Các method giữ nguyên tên field request và response từ API. Request có thể nhận `AbortSignal`. GET được thử lại khi gặp lỗi mạng, HTTP 429 hoặc 5xx và tôn trọng `Retry-After`; request ghi chỉ được gửi một lần. HTTP lỗi hoặc body có `success: false` sẽ ném `PancakeApiError`.

Pancake yêu cầu truyền token qua query string. Hãy dùng SDK phía server, giữ token ngoài mã nguồn và tránh ghi log URL request. Việc tạo lại Page Access Token có thể vô hiệu token cũ, nên SDK không tự thực hiện thao tác đó. Giới hạn tốc độ chỉ áp dụng trong một client instance; nếu có nhiều tiến trình, ứng dụng cần tự phối hợp.

## Nguồn schema và giới hạn kiểm chứng

- REST API OpenAPI: [packages/pancake-client/openapi/openapi.yaml](packages/pancake-client/openapi/openapi.yaml) (sinh types qua `bun run schema:generate`, ghi chú trong [PATCHES.md](packages/pancake-client/openapi/PATCHES.md)).
- Webhooks OpenAPI: [packages/pancake-client/openapi/webhook.yaml](packages/pancake-client/openapi/webhook.yaml) (lưu trực tiếp từ nguồn chính thức `https://developer.pancake.biz/openapi/webhook.yaml`).

Types giúp kiểm tra lúc viết TypeScript; SDK chưa kiểm tra schema response khi chạy. Test hiện dùng HTTP mock và mẫu OpenAPI chính thức, chưa kiểm chứng bằng tài khoản Pancake thật.
