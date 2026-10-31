/* ============================================================
   统一响应结构
   与旧 PHP 接口保持 code / message / data 约定
   ============================================================ */

export interface ApiResult<T = Record<string, unknown>> {
  code: number
  message: string
  data: T
}

export function ok<T>(data: T, message = 'success'): ApiResult<T> {
  return { code: 0, message, data }
}

export function fail(code: number, message: string): ApiResult<Record<string, never>> {
  return { code, message, data: {} }
}

/* 业务错误码 */
export const ERR = {
  METHOD_NOT_ALLOWED: 1001,
  INVALID_PARAM: 1005,
  INVALID_PATH: 1006,
  BAD_CREDENTIAL: 2001,
  UNAUTHORIZED: 2003,
  FORBIDDEN: 3002,
  DB_NOT_FOUND: 4001,
  DB_DIR_MISSING: 5001,
  INTERNAL: 5000
} as const
