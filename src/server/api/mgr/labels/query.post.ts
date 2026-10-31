/* ============================================================
   查询标签列表
   POST { dbPath, dbName, min, max }
   ============================================================ */

import { DatabaseSync } from 'node:sqlite'
import { guard, isGuardFailure } from '../../../utils/auth'
import { locateChannelDb } from '../../../utils/mgr-db'
import { MAX_QUERY_ROWS } from '../../../config/site'
import { initChannelDb, parseLabels, rangeWhere } from '../../../utils/sqlite'
import { fail, ok, ERR } from '../../../utils/response'

interface QueryBody {
  dbPath?: string
  dbName?: string
  min?: number
  max?: number
}

export default defineEventHandler(async (event) => {
  const auth = guard(event, 'R')
  if (isGuardFailure(auth)) return auth.response

  const body = (await readBody<QueryBody>(event).catch(() => ({}))) || {}
  const dbPath = String(body.dbPath || '').trim()
  const dbName = String(body.dbName || '').trim()
  if (!dbPath && !dbName) return fail(ERR.INVALID_PARAM, '数据库路径不能为空')

  const min = Math.min(Math.floor(Number(body.min) || 0), MAX_QUERY_ROWS)
  const max = Math.min(Math.floor(Number(body.max) || 0), MAX_QUERY_ROWS)

  try {
    const target = locateChannelDb(dbPath, dbName, false)
    const db = new DatabaseSync(target.file)
    try {
      initChannelDb(db)
      const rows = db.prepare('SELECT media_id AS id, labels FROM media_labels' + rangeWhere(min, max))
        .all() as Array<{ id: number, labels: string }>
      const labels = rows.map(row => ({ id: Number(row.id), labels: parseLabels(row.labels) }))
      return ok({ labels })
    } finally {
      db.close()
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message.includes('不存在')) return fail(ERR.DB_NOT_FOUND, '数据库文件不存在')
    return fail(ERR.INVALID_PATH, '路径不合法')
  }
})
