import type { paths } from '../generated/schema.js'

export interface RequestOptions {
  signal?: AbortSignal
}

export type Operation<
  Path extends keyof paths,
  Method extends keyof paths[Path],
> = paths[Path][Method]

type AuthenticationQuery = 'access_token' | 'page_access_token'

export type QueryOf<T> = T extends { parameters: { query: infer Query } }
  ? Omit<Query, AuthenticationQuery>
  : never

export type JsonBodyOf<T> = T extends {
  requestBody: { content: { 'application/json': infer Body } }
} ? Body : never

export type MultipartBodyOf<T> = T extends {
  requestBody: { content: { 'multipart/form-data': infer Body } }
} ? Body : never

type JsonResponseUnion<T> = T extends { responses: infer Responses }
  ? {
      [Status in keyof Responses]: `${Status & (string | number)}` extends `2${string}`
        ? Responses[Status] extends {
        content: { 'application/json': infer Response }
          } ? Response : never
        : never
    }[keyof Responses]
  : never

export type ResponseOf<T> = [JsonResponseUnion<T>] extends [never]
  ? unknown
  : JsonResponseUnion<T>

export function segment(value: string): string {
  return encodeURIComponent(value)
}

