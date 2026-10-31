/* ============================================================
   管理端接口封装
   自动附加 Bearer 令牌, 统一解析 code / message / data
   ============================================================ */

import type { ExtraRecord, LabelRecord, StatsRecord } from '~~/shared/types/channel'

/* 会话与工作区存储键, 与原管理端实现保持一致 */
export const MGR_TOKEN_KEY = 'mgr_token'
export const MGR_USERNAME_KEY = 'mgr_username'
export const MGR_SOURCE_KEY = 'mgr_source'
export const MGR_WORKSPACE_KEY = 'mgr_workspace'

/* 管理端接口前缀 */
const MGR_API_BASE = '/api/mgr'

/* 统一响应结构 */
export interface MgrApiResult<T> {
  code: number
  message: string
  data: T
}

/* 登录返回 */
export interface MgrLoginData {
  token: string
  deadline: string
  username: string
}

/* 当前用户信息, permission 为四位权限编码 C D R U */
export interface MgrInfoData {
  username: string
  permission: string | null
}

/* 服务端指定的频道条目 */
export interface MgrChannel {
  id: string
  name: string
  dbPath: string
  dbName: string
  mediaType: string
  mediaPrefix: string
  mediaExt: string
  mediaIdMin: number
  mediaIdMax: number
  mediaIdLength: number
}

export interface MgrChannelsData {
  channels: MgrChannel[]
}

/* 同源数据库文件条目, path 为相对数据库根目录的路径 */
export interface MgrDbFile {
  name: string
  path: string
  size: number
  mtime: string
}

export interface MgrDbListData {
  files: MgrDbFile[]
}

/* 连接结果 */
export interface MgrConnectData {
  dbPath: string
  tables: string[]
}

/* 三张核心表行数 */
export interface MgrTableCounts {
  stats: number
  extra: number
  labels: number
}

/* 修复结果 */
export interface MgrFixData {
  before: MgrTableCounts
  after: MgrTableCounts
  filled: MgrTableCounts
  maxId: number
}

/* 标签查询结果 */
export interface MgrLabelsData {
  labels: LabelRecord[]
}

/* 标签更新结果 */
export interface MgrUpdateLabelsData {
  id: number
  labels: string[]
}

/* 统计查询结果 */
export interface MgrStatsData {
  stats: StatsRecord[]
  extra: ExtraRecord[]
  labels: LabelRecord[]
}

/* 查询参数取值 */
type QueryValue = string | number | boolean

/* 读取本地令牌, 隐私模式下静默降级 */
export function readMgrToken(): string {
  try {
    return localStorage.getItem(MGR_TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

/* 读取本地用户名 */
export function readMgrUsername(): string {
  try {
    return localStorage.getItem(MGR_USERNAME_KEY) || ''
  } catch {
    return ''
  }
}

/* 写入会话令牌与用户名 */
export function saveMgrSession(token: string, username: string): void {
  try {
    localStorage.setItem(MGR_TOKEN_KEY, token)
    localStorage.setItem(MGR_USERNAME_KEY, username)
  } catch {
    /* 配额或权限异常时静默降级 */
  }
}

/* 清除会话 */
export function clearMgrSession(): void {
  try {
    localStorage.removeItem(MGR_TOKEN_KEY)
    localStorage.removeItem(MGR_USERNAME_KEY)
  } catch {
    /* 忽略移除异常 */
  }
}

/* 网络层错误转为可读文案 */
function resolveRequestError(error: unknown): string {
  const payload = (error as { data?: { message?: string } } | null)?.data
  if (payload && typeof payload.message === 'string' && payload.message) return payload.message
  return '网络请求失败, 请检查服务状态'
}

/* 统一请求: 附加令牌, 校验 code, 返回 data */
async function request<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST'
    body?: Record<string, unknown>
    query?: Record<string, QueryValue>
  } = {}
): Promise<T> {
  const headers: Record<string, string> = {}
  const token = readMgrToken()
  if (token) headers.Authorization = 'Bearer ' + token

  let payload: MgrApiResult<T>
  try {
    payload = await $fetch<MgrApiResult<T>>(MGR_API_BASE + path, {
      method: options.method || 'GET',
      headers,
      body: options.body,
      query: options.query
    })
  } catch (error) {
    throw new Error(resolveRequestError(error))
  }

  if (!payload || typeof payload.code !== 'number') throw new Error('接口返回格式异常')
  if (payload.code !== 0) throw new Error(payload.message || '请求失败')
  return payload.data
}

export function useMgrApi() {
  /* 登录, 成功后返回令牌与截止时间 */
  function login(username: string, password: string): Promise<MgrLoginData> {
    return request<MgrLoginData>('/auth/login', {
      method: 'POST',
      body: { username, password }
    })
  }

  /* 登出, 服务端注销令牌 */
  async function logout(): Promise<void> {
    await request<Record<string, never>>('/auth/logout', { method: 'POST', body: {} })
  }

  /* 校验令牌并取回权限 */
  function fetchInfo(): Promise<MgrInfoData> {
    return request<MgrInfoData>('/auth/info')
  }

  /* 服务端指定的频道列表 */
  function fetchChannels(): Promise<MgrChannelsData> {
    return request<MgrChannelsData>('/channels')
  }

  /* 同源数据库文件列表 */
  function listDbs(): Promise<MgrDbListData> {
    return request<MgrDbListData>('/db/list')
  }

  /* 连接数据库并列出数据表 */
  function connectDb(dbPath: string): Promise<MgrConnectData> {
    return request<MgrConnectData>('/db/connect', {
      method: 'POST',
      body: { dbPath }
    })
  }

  /* 修复数据库, 补齐三张表的缺失行 */
  function fixDb(dbPath: string, dbName = ''): Promise<MgrFixData> {
    return request<MgrFixData>('/db/fix', {
      method: 'POST',
      body: { dbPath, dbName }
    })
  }

  /* 查询指定 ID 区间的标签 */
  function queryLabels(params: {
    dbPath?: string
    dbName?: string
    min?: number
    max?: number
  }): Promise<MgrLabelsData> {
    return request<MgrLabelsData>('/labels/query', {
      method: 'POST',
      body: {
        dbPath: params.dbPath || '',
        dbName: params.dbName || '',
        min: params.min ?? 0,
        max: params.max ?? 0
      }
    })
  }

  /* 更新单个媒体 ID 的标签 */
  function updateLabels(params: {
    dbPath?: string
    dbName?: string
    id: number
    labels: string[]
  }): Promise<MgrUpdateLabelsData> {
    return request<MgrUpdateLabelsData>('/labels/update', {
      method: 'POST',
      body: {
        dbPath: params.dbPath || '',
        dbName: params.dbName || '',
        id: params.id,
        labels: params.labels
      }
    })
  }

  /* 统计查询, fullQuery 为真时忽略 ID 区间 */
  function fetchStats(params: {
    dbPath?: string
    dbName?: string
    min?: number
    max?: number
    fullQuery?: boolean
  }): Promise<MgrStatsData> {
    const query: Record<string, QueryValue> = {
      dbPath: params.dbPath || '',
      dbName: params.dbName || ''
    }
    if (params.fullQuery) {
      query.fullQuery = '1'
    } else {
      query.min = params.min ?? 0
      query.max = params.max ?? 0
    }
    return request<MgrStatsData>('/stats', { query })
  }

  return {
    login,
    logout,
    fetchInfo,
    fetchChannels,
    listDbs,
    connectDb,
    fixDb,
    queryLabels,
    updateLabels,
    fetchStats
  }
}
