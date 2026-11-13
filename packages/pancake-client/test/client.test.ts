import { expect, test } from 'bun:test'
import { PancakeApiError, PancakeClient } from '../src/index.js'

test('account and page requests use the documented token query names', async () => {
  const urls: URL[] = []
  const client = new PancakeClient({
    accessToken: 'account-secret', pageAccessToken: 'page-secret', pageId: 'page-1', rateLimit: false,
    fetch: async (input) => {
      urls.push(new URL(String(input)))
      return Response.json({ success: true, pages: [] })
    },
  })
  await client.pages.list()
  await client.conversations.list({})
  expect(urls[0]?.searchParams.get('access_token')).toBe('account-secret')
  expect(urls[0]?.searchParams.has('page_access_token')).toBe(false)
  expect(urls[1]?.pathname).toContain('/pages/page-1/conversations')
  expect(urls[1]?.searchParams.get('page_access_token')).toBe('page-secret')
})

test('public avatar request does not send credentials', async () => {
  let requested: URL | undefined
  const client = new PancakeClient({
    fetch: async (input) => {
      requested = new URL(String(input))
      return new Response(new Blob(['image'], { type: 'image/png' }))
    },
  })
  await client.customers.getAvatar('page-1', 'person-1')
  expect(requested?.search).toBe('')
})

test('HTTP 200 success false raises an API error with a redacted token', async () => {
  const client = new PancakeClient({
    accessToken: 'account-secret', maxRetries: 0,
    fetch: async () => Response.json({ success: false, message: 'bad account-secret', error_code: 100 }),
  })
  try {
    await client.pages.list()
    throw new Error('Expected PancakeApiError')
  } catch (error) {
    expect(error).toBeInstanceOf(PancakeApiError)
    expect((error as Error).message).not.toContain('account-secret')
  }
})
