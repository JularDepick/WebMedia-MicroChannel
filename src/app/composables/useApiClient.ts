/* ============================================================
   频道后端客户端
   backend 支持同源相对路径与远程绝对地址,端点为 data
   ============================================================ */

export interface ChannelApiClient {
  post: <T>(body: Record<string, unknown>) => Promise<T | null>
  get: <T>(query: Record<string, unknown>) => Promise<T | null>
}

export function createChannelApi(backend: string): ChannelApiClient {
  const base = backend.endsWith('/') ? backend : backend + '/'
  const endpoint = base + 'data'

  async function post<T>(body: Record<string, unknown>): Promise<T | null> {
    try {
      return await $fetch<T>(endpoint, { method: 'POST', body })
    } catch {
      return null
    }
  }

  async function get<T>(query: Record<string, unknown>): Promise<T | null> {
    try {
      return await $fetch<T>(endpoint, { method: 'GET', query: query as Record<string, string> })
    } catch {
      return null
    }
  }

  return { post, get }
}
