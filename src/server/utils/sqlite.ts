/* ============================================================
   频道数据库访问层
   使用 Node 内置 node:sqlite,替代原 PHP SQLite3 扩展
   ============================================================ */

import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, realpathSync, existsSync } from 'node:fs'
import { isAbsolute, resolve, sep } from 'node:path'

const STATS_DDL = `CREATE TABLE IF NOT EXISTS media_stats (
  media_id INTEGER PRIMARY KEY,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  favorites INTEGER NOT NULL DEFAULT 0
)`

const EXTRA_DDL = `CREATE TABLE IF NOT EXISTS media_extra (
  media_id INTEGER PRIMARY KEY,
  downloads INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  blocks INTEGER NOT NULL DEFAULT 0
)`

const LABELS_DDL = `CREATE TABLE IF NOT EXISTS media_labels (
  media_id INTEGER PRIMARY KEY,
  labels TEXT NOT NULL DEFAULT '[]'
)`

export interface StatsRow {
  id: number
  views: number
  likes: number
  favorites: number
}

export interface ExtraRow {
  id: number
  downloads: number
  shares: number
  blocks: number
}

export interface LabelRow {
  id: number
  labels: string[]
}

/*
 * 解析数据路径
 * 绝对路径直接使用, 相对路径依次尝试启动目录与启动目录下的 src/
 * 便于开发时在 src/ 启动、部署时在项目根启动, 均能定位到同一份数据
 */
/*
 * 识别项目根目录
 * 以依赖声明或构建产物为标记, 兼容从项目根、src 或 dist 启动
 */
export function detectProjectRoot(start = process.cwd()): string {
  let dir = resolve(start)
  for (let depth = 0; depth < 4; depth++) {
    if (existsSync(resolve(dir, 'src', 'package.json')) || existsSync(resolve(dir, 'dist', 'server', 'index.mjs'))) {
      return dir
    }
    const parent = resolve(dir, '..')
    if (parent === dir) break
    dir = parent
  }
  return resolve(start)
}

/* 判断路径是否落在构建产物目录内, 以 nitro.json 或 server 子目录为标记 */
function insideBuildOutput(target: string): boolean {
  const parts = resolve(target).split(/[\\/]+/)
  for (let index = 0; index < parts.length; index++) {
    if (parts[index] !== 'dist') continue
    const distDir = parts.slice(0, index + 1).join(sep)
    if (existsSync(resolve(distDir, 'nitro.json')) || existsSync(resolve(distDir, 'server'))) {
      return true
    }
  }
  return false
}

/* 运行时数据根目录: 固定在项目根下的 data/, 不随构建产物清理 */
export function dataRoot(): string {
  const raw = String(process.env.WMMC_DATA_DIR || useRuntimeConfig().dataDir || 'data')
  const root = isAbsolute(raw) ? raw : resolve(detectProjectRoot(), raw)
  if (insideBuildOutput(root)) {
    throw new Error('数据目录不能位于构建产物目录内: ' + root + ', 请用环境变量 WMMC_DATA_DIR 指定数据目录')
  }
  return root
}

/* 频道数据库根目录, 可由 WMMC_DB_DIR 覆盖 */
export function dbRoot(): string {
  const override = String(process.env.WMMC_DB_DIR || '').trim()
  if (override !== '') return isAbsolute(override) ? override : resolve(dataRoot(), override)
  return resolve(dataRoot(), 'sqlitedb')
}

function ensureDir(dir: string): string {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return realpathSync(dir)
}

function requireDir(dir: string): string {
  if (!existsSync(dir)) throw new Error('directory not found: ' + dir)
  return realpathSync(dir)
}

/*
 * 解析频道数据库目录
 * 只接受相对路径,禁止绝对路径与向上遍历,解析结果必须落在根目录内
 */
export function resolveDbDir(dbPath = '', create = true): string {
  const root = create ? ensureDir(dbRoot()) : requireDir(dbRoot())
  const normalized = String(dbPath || '').replace(/\\/g, '/').trim()
  if (normalized === '' || normalized === '.') return root
  if (normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized)) {
    throw new Error('dbPath must be a relative path, not absolute')
  }
  if (normalized.split('/').includes('..')) {
    throw new Error('dbPath must not contain ".." traversal')
  }
  const target = resolve(root, normalized)
  if (target !== root && !target.startsWith(root + sep)) {
    throw new Error('dbPath escapes base directory')
  }
  return create ? ensureDir(target) : requireDir(target)
}

/* 解析频道数据库完整文件路径,仅允许 .db 后缀 */
export function resolveDbFile(dbPath = '', dbName = 'media-cls0.db'): string {
  const dir = resolveDbDir(dbPath)
  const baseName = String(dbName || '').replace(/\\/g, '/').split('/').pop() || ''
  if (!baseName.toLowerCase().endsWith('.db')) {
    throw new Error('dbName must have .db extension')
  }
  return resolve(dir, baseName)
}

/* 建立三张核心表,幂等 */
export function initChannelDb(db: DatabaseSync): void {
  db.exec(STATS_DDL)
  db.exec(EXTRA_DDL)
  db.exec(LABELS_DDL)
}

/* 打开频道数据库并确保表结构存在 */
export function openChannelDb(dbPath = '', dbName = 'media-cls0.db'): DatabaseSync {
  const file = resolveDbFile(dbPath, dbName)
  const db = new DatabaseSync(file)
  db.exec('PRAGMA busy_timeout = 5000')
  initChannelDb(db)
  return db
}

/* 只读打开已存在的频道数据库 */
export function openChannelDbReadonly(file: string): DatabaseSync {
  if (!existsSync(file)) throw new Error('database file not found')
  const db = new DatabaseSync(file, { readOnly: true })
  db.exec('PRAGMA busy_timeout = 5000')
  return db
}

/* 兼容旧库: 补齐三张表到统一的最大编号 */
export function alignChannelRows(db: DatabaseSync, maxId: number): void {
  if (maxId <= 0) return
  const stmtStats = db.prepare('INSERT OR IGNORE INTO media_stats (media_id, views, likes, favorites) VALUES (?, 0, 0, 0)')
  const stmtExtra = db.prepare('INSERT OR IGNORE INTO media_extra (media_id, downloads, shares, blocks) VALUES (?, 0, 0, 0)')
  const stmtLabels = db.prepare('INSERT OR IGNORE INTO media_labels (media_id, labels) VALUES (?, \'[]\')')
  db.exec('BEGIN')
  try {
    for (let i = 1; i <= maxId; i++) {
      stmtStats.run(i)
      stmtExtra.run(i)
      stmtLabels.run(i)
    }
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

function maxOf(db: DatabaseSync, table: string): number {
  const row = db.prepare(`SELECT MAX(media_id) AS m FROM ${table}`).get() as { m: number | null } | undefined
  return row && row.m ? Number(row.m) : 0
}

export function maxMediaId(db: DatabaseSync): number {
  return Math.max(maxOf(db, 'media_stats'), maxOf(db, 'media_extra'), maxOf(db, 'media_labels'))
}

/* 将编号区间扩展到 max,超出上限时截断 */
export function expandTo(db: DatabaseSync, max: number, limit: number): number {
  const existing = maxMediaId(db)
  const target = Math.min(max, limit)
  if (target > existing) alignChannelRows(db, target)
  return target
}

export function readStats(db: DatabaseSync, where = ''): StatsRow[] {
  const rows = db.prepare('SELECT media_id AS id, views, likes, favorites FROM media_stats' + where).all()
  return rows as unknown as StatsRow[]
}

export function readExtra(db: DatabaseSync, where = ''): ExtraRow[] {
  const rows = db.prepare('SELECT media_id AS id, downloads, shares, blocks FROM media_extra' + where).all()
  return rows as unknown as ExtraRow[]
}

export function readLabels(db: DatabaseSync, where = ''): LabelRow[] {
  const rows = db.prepare('SELECT media_id AS id, labels FROM media_labels' + where).all() as Array<{ id: number, labels: string }>
  return rows.map(row => ({ id: Number(row.id), labels: parseLabels(row.labels) }))
}

/* 标签字段为 JSON 文本,解析失败时回退为空数组 */
export function parseLabels(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[]
  if (typeof raw !== 'string' || raw === '') return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((item: unknown) => typeof item === 'string') : []
  } catch {
    return []
  }
}

/* 区间查询的 WHERE 片段,参数均已归一为整数 */
export function rangeWhere(min: number, max: number): string {
  if (!(min > 0 && max >= min)) return ''
  return ` WHERE media_id BETWEEN ${Math.floor(min)} AND ${Math.floor(max)}`
}
