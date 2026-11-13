# Pancake TypeScript Client

SDK TypeScript **không chính thức** cho [Pancake REST API](https://developer.pancake.biz/). Package bao phủ 32 HTTP operations trong OpenAPI hiện tại. Webhook không nằm trong package này.

## Yêu cầu

- Node.js 22+ hoặc Bun
- Bun để cài dependencies và build từ mã nguồn

## Cài đặt và build

```bash
git clone https://github.com/hi02102002/pancake-typescript-client.git
cd pancake-typescript-client
bun install
bun run check
bun test
bun run build
```

Package nằm ở `packages/pancake-client`. Bản build ESM và TypeScript declarations nằm trong `packages/pancake-client/dist`. Package không có dependency khi chạy. Bản phát hành có trên [npm](https://www.npmjs.com/package/pancake-client).

## Sử dụng

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

## Cấu hình

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

[OpenAPI được lưu trong repo](packages/pancake-client/openapi/openapi.yaml) là nguồn để sinh types. Các chỉnh sửa schema phục vụ sinh types được ghi trong [PATCHES.md](packages/pancake-client/openapi/PATCHES.md). Sau khi cập nhật OpenAPI, chạy `bun run schema:generate`.

Types giúp kiểm tra lúc viết TypeScript; SDK chưa kiểm tra schema response khi chạy. Test hiện dùng HTTP mock, chưa kiểm chứng bằng tài khoản Pancake thật.
