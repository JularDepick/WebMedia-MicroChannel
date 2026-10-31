/* ============================================================
   主站统一数据接口
   POST { dbPath, db, table, action, id }
   stats 动作: view / like / favorite
   extra 动作: download / share / block
   标签动作: getLabels / setLabels
   数据动作: getData
   ============================================================ */

import { normalizeRange, loadChannelData, STATS_COLUMNS, EXTRA_COLUMNS } from '../utils/channel-data'
import { openChannelDb, parseLabels } from '../utils/sqlite'
import { MAX_LABEL_LENGTH } from '../config/site'

interface PostBody {
  dbPath?: string
  db?: string
  table?: string
  action?: string
  id?: number | string
  labels?: unknown
  min?: number
  max?: number
  fullQuery?: boolean
}

export default defineEventHandler(async (event) => {
  let body: PostBody = {}
  try {
    body = (await readBody<PostBody>(event)) || {}
  } catch {
    body = {}
  }

  const dbPath = String(body.dbPath || '')
  const dbName = String(body.db || 'media-cls0.db')
  const table = String(body.table || 'stats')
  const action = String(body.action || '')
  const id = Math.floor(Number(body.id) || 0)

  try {
    if (action === 'getData') {
      return loadChannelData(dbPath, dbName, {
        min: Number(body.min) || 0,
        max: Number(body.max) || 0,
        fullQuery: Boolean(body.fullQuery)
      })
    }

    if (action === 'getLabels') {
      const db = openChannelDb(dbPath, dbName)
      try {
        const where = id > 0 ? ' WHERE media_id = ' + id : ''
        const rows = db.prepare('SELECT media_id AS id, labels FROM media_labels' + where).all() as
          Array<{ id: number, labels: string }>
        return {
          ok: true,
          labels: rows.map(row => ({ id: Number(row.id), labels: parseLabels(row.labels) }))
        }
      } finally {
        db.close()
      }
    }

    if (action === 'setLabels') {
      if (id < 1) return { ok: false, error: 'invalid id' }
      if (!Array.isArray(body.labels)) return { ok: false, error: 'labels must be an array' }
      const cleaned = cleanLabels(body.labels)
      const db = openChannelDb(dbPath, dbName)
      try {
        db.prepare(`INSERT INTO media_labels (media_id, labels) VALUES (?, ?)
          ON CONFLICT(media_id) DO UPDATE SET labels = ?`).run(id, JSON.stringify(cleaned), JSON.stringify(cleaned))
      } finally {
        db.close()
      }
      return { ok: true, id, labels: cleaned }
    }

    if (id < 1) return { ok: false, error: 'invalid id' }

    let column = ''
    let targetTable = ''
    if (table === 'stats' && STATS_COLUMNS[action]) {
      column = STATS_COLUMNS[action]
      targetTable = 'media_stats'
    } else if (table === 'extra' && EXTRA_COLUMNS[action]) {
      column = EXTRA_COLUMNS[action]
      targetTable = 'media_extra'
    } else {
      return { ok: false, error: 'invalid table/action' }
    }

    const db = openChannelDb(dbPath, dbName)
    try {
      db.prepare(`INSERT INTO ${targetTable} (media_id, ${column}) VALUES (?, 1)
        ON CONFLICT(media_id) DO UPDATE SET ${column} = ${column} + 1`).run(id)
      const row = db.prepare(`SELECT ${column} AS c FROM ${targetTable} WHERE media_id = ?`).get(id) as
        { c: number } | undefined
      return { ok: true, id, count: row ? Number(row.c) : 1 }
    } finally {
      db.close()
    }
  } catch (err) {
    setResponseStatus(event, 500)
    return { ok: false, error: 'internal server error' }
  }
})

/* 标签清理: 去空白、截断超长项、去重,保持原有顺序 */
function cleanLabels(input: unknown[]): string[] {
  const result: string[] = []
  for (const raw of input) {
    const label = String(raw ?? '').trim()
    if (label !== '' && label.length <= MAX_LABEL_LENGTH && !result.includes(label)) {
      result.push(label)
    }
  }
  return result
}
