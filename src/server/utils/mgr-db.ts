/* ============================================================
   管理端数据库定位
   兼容传入 "cait/xxx.db" 与 "sqlitedb/cait/xxx.db" 两种写法
   ============================================================ */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { mkdirSync } from 'node:fs'
import { resolveDbDir } from './sqlite'

export interface DbTarget {
  dir: string
  name: string
  file: string
}

function stripPrefix(value: string): string {
  return value.replace(/^sqlitedb\/?/, '')
}

/* 拆分路径与文件名,并解析为受约束的绝对路径 */
export function locateChannelDb(dbPath = '', dbName = '', create = false): DbTarget {
  let dir = stripPrefix(String(dbPath || '').replace(/\\/g, '/').trim())
  let name = String(dbName || '').replace(/\\/g, '/').trim()

  if (dir === '' && name.includes('/')) {
    const index = name.lastIndexOf('/')
    dir = name.slice(0, index)
    name = name.slice(index + 1)
  }

  dir = dir.replace(/^\/+|\/+$/g, '')

  if (name === '') throw new Error('数据库文件名不能为空')
  if (name.includes('/') || name.includes('\\')) throw new Error('数据库文件名不合法')
  if (!name.toLowerCase().endsWith('.db')) throw new Error('数据库文件必须为 .db')

  const baseDir = resolveDbDir(dir, create)
  const file = resolve(baseDir, name)
  return { dir: baseDir, name, file }
}

/* 打开前必须确保文件存在 */
export function requireChannelDbFile(dbPath = '', dbName = ''): DbTarget {
  const target = locateChannelDb(dbPath, dbName, false)
  if (!existsSync(target.file)) throw new Error('数据库文件不存在')
  return target
}

/* 目录不存在时按需创建 */
export function ensureDirExists(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

/* 统一时间格式 yyyy-MM-dd HH:mm:ss */
export function formatDateTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
