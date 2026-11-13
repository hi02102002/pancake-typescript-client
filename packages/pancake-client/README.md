# @hoanghuydev/pancake-client

SDK TypeScript không chính thức cho [Pancake REST API](https://developer.pancake.biz/). Hỗ trợ 32 HTTP operations; webhook không nằm trong package.

```bash
npm install @hoanghuydev/pancake-client
```

```ts
import { PancakeClient } from '@hoanghuydev/pancake-client'

const page = new PancakeClient({
  pageId: process.env.PANCAKE_PAGE_ID,
  pageAccessToken: process.env.PANCAKE_PAGE_ACCESS_TOKEN,
})

const conversations = await page.conversations.list({})
```

Package dành cho server Node.js 22+ hoặc Bun. Pancake yêu cầu token trong query string, vì vậy cần giữ token bí mật và tránh ghi log URL request. Xem [README đầy đủ](https://github.com/hi02102002/pancake-typescript-client#readme) để biết cách cấu hình, phân trang và giới hạn kiểm chứng.
