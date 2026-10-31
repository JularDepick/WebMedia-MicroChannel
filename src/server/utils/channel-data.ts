/* ============================================================
   频道数据读写
   主站数据接口的公共逻辑
   ============================================================ */

import type { DatabaseSync } from 'node:sqlite'
import { MAX_DB_ROWS, MAX_QUERY_ROWS } from '../config/site'
import {
  expandTo,
  openChannelDb,
  rangeWhere,
  readExtra,
  readLabels,
  readStats,
  type ExtraRow,
  type LabelRow,
  type StatsRow
} from './sqlite'

export interface ChannelData {
  stats: StatsRow[]
  extra: ExtraRow[]
  labels: LabelRow[]
}

export interface QueryRange {
  min: number
  max: number
  fullQuery: boolean
}

/* 归一化查询区间: 上限截断, 区间倒置时收敛 */
export function normalizeRange(min: unknown, max: unknown): { min: number, max: number } {
  let low = Math.min(Math.max(0, Math.floor(Number(min) || 0)), MAX_QUERY_ROWS)
  let high = Math.min(Math.max(0, Math.floor(Number(max) || 0)), MAX_QUERY_ROWS)
  if (high > MAX_DB_ROWS) high = MAX_DB_ROWS
  if (low > high) low = high
  return { min: low, max: high }
}

function collect(db: DatabaseSync, where: string): ChannelData {
  return {
    stats: readStats(db, where),
    extra: readExtra(db, where),
    labels: readLabels(db, where)
  }
}

/* 读取频道数据: 全量模式不做扩容,区间模式按需补齐缺失行 */
export function loadChannelData(dbPath: string, dbName: string, range: QueryRange): ChannelData {
  const db = openChannelDb(dbPath, dbName)
  try {
    if (range.fullQuery) return collect(db, '')
    const { min, max } = normalizeRange(range.min, range.max)
    if (min > 0 && max >= min) {
      const target = expandTo(db, max, MAX_DB_ROWS)
      return collect(db, rangeWhere(min, target))
    }
    return collect(db, '')
  } finally {
    db.close()
  }
}

/* 统计列白名单, 防止动态列名注入 */
export const STATS_COLUMNS: Record<string, string> = {
  view: 'views',
  like: 'likes',
  favorite: 'favorites'
}

export const EXTRA_COLUMNS: Record<string, string> = {
  download: 'downloads',
  share: 'shares',
  block: 'blocks'
}
