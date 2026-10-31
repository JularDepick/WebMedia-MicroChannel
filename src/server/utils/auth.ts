/* ============================================================
   管理端认证与权限
   沿用旧 PHP 实现: 盐值加 SHA-512 摘要,Token 存 SQLite
   ============================================================ */

import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, existsSync } from 'node:fs'
import { createHash, randomBytes } from 'node:crypto'
import { dirname, isAbsolute, resolve } from 'node:path'
import type { H3Event } from 'h3'
import { ADMIN_ACCOUNTS, PASSWORD_SALT, TOKEN_TTL, USER_PERMISSIONS } from '../config/site'
import { fail, ERR, type ApiResult } from './response'
import { dataRoot } from './sqlite'

export type PermFlag = 'C' | 'D' | 'R' | 'U'

/* 认证库路径: 默认落在数据根目录, 可由 WMMC_AUTH_DB 覆盖 */
export function authDbPath(): string {
  const override = String(process.env.WMMC_AUTH_DB || '').trim()
  if (override !== '') return isAbsolute(override) ? override : resolve(dataRoot(), override)
  return resolve(dataRoot(), 'auth.db')
}

export function openAuthDb(): DatabaseSync {
  const file = authDbPath()
  if (!existsSync(file)) mkdirSync(dirname(file), { recursive: true })
  const db = new DatabaseSync(file)
  db.exec('PRAGMA busy_timeout = 5000')
  db.exec(`CREATE TABLE IF NOT EXISTS tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username CHAR(32) UNIQUE NOT NULL,
    deadline TIMESTAMP NOT NULL,
    token CHAR(128) NOT NULL
  )`)
  return db
}

/* 与前端密码生成器保持一致的摘要算法 */
export function hashPassword(username: string, password: string, salt = PASSWORD_SALT): string {
  return createHash('sha512').update(`${salt}|${username}|${password}`).digest('hex')
}

export function permissionOf(username: string): string | null {
  return USER_PERMISSIONS[username] ?? null
}

export function hasPermission(username: string, flag: PermFlag): boolean {
  const perm = permissionOf(username)
  if (!perm || perm.length < 4) return false
  const index = { C: 0, D: 1, R: 2, U: 3 }[flag]
  return perm[index] === '1'
}

export function extractToken(event: H3Event): string {
  const header = String(getHeader(event, 'authorization') || '')
  const matched = header.match(/^Bearer\s+(.+)$/i)
  return matched ? matched[1].trim() : ''
}

export function verifyToken(event: H3Event): string | false {
  const token = extractToken(event)
  if (!token) return false
  const db = openAuthDb()
  try {
    const row = db.prepare('SELECT username, deadline FROM tokens WHERE token = ?').get(token) as
      { username: string, deadline: string } | undefined
    if (!row) return false
    if (new Date(row.deadline.replace(' ', 'T')).getTime() < Date.now()) return false
    return row.username
  } finally {
    db.close()
  }
}

export type GuardResult = { username: string } | { response: ApiResult<Record<string, never>> }

/* 认证与权限守卫: 未通过时返回可直接下发的响应 */
export function guard(event: H3Event, need: PermFlag = 'R'): GuardResult {
  const username = verifyToken(event)
  if (username === false) return { response: fail(ERR.UNAUTHORIZED, '未授权,请先登录') }
  if (!hasPermission(username, need)) return { response: fail(ERR.FORBIDDEN, '权限不足') }
  return { username }
}

export function isGuardFailure(result: GuardResult): result is { response: ApiResult<Record<string, never>> } {
  return 'response' in result
}

/* 生成并落库一个新的登录令牌 */
export function issueToken(username: string): { token: string, deadline: string } {
  const deadlineDate = new Date(Date.now() + TOKEN_TTL * 1000)
  const deadline = formatDeadline(deadlineDate)
  const token = createHash('sha512')
    .update(`${username}|${Date.now()}|${deadline}|${randomBytes(16).toString('hex')}`)
    .digest('hex')
  const db = openAuthDb()
  try {
    db.prepare('INSERT OR REPLACE INTO tokens (username, deadline, token) VALUES (?, ?, ?)')
      .run(username, deadline, token)
  } finally {
    db.close()
  }
  return { token, deadline }
}

export function revokeToken(username: string): void {
  const db = openAuthDb()
  try {
    db.prepare('DELETE FROM tokens WHERE username = ?').run(username)
  } finally {
    db.close()
  }
}

/* 统一使用 yyyy-MM-dd HH:mm:ss 存储截止时间 */
function formatDeadline(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
