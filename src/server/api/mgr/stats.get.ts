/* ============================================================
   查看频道统计数据
   GET ?dbPath=&dbName=&min=&max=&fullQuery=1
   ============================================================ */

import { DatabaseSync } from 'node:sqlite'
import { guard, isGuardFailure } from '../../utils/auth'
import { locateChannelDb } from '../../utils/mgr-db'
import { MAX_QUERY_ROWS } from '../../config/site'
import { initChannelDb, rangeWhere, readExtra, readLabels, readStats } from '../../utils/sqlite'
import { fail, ok, ERR } from '../../utils/response'

export default defineEventHandler((event) => {
  const auth = guard(event, 'R')
  if (isGuardFailure(auth)) return auth.response

  const query = getQuery(event)
  const dbPath = String(query.dbPath || '').trim()
  const dbName = String(query.dbName || '').trim()
  if (!dbPath && !dbName) return fail(ERR.INVALID_PARAM, '参数不完整')

  const fullQuery = String(query.fullQuery || '') === '1'
  const min = Math.min(Math.floor(Number(query.min) || 0), MAX_QUERY_ROWS)
  const max = Math.min(Math.floor(Number(query.max) || 0), MAX_QUERY_ROWS)

  try {
    const target = locateChannelDb(dbPath, dbName, false)
    const db = new DatabaseSync(target.file)
    try {
      initChannelDb(db)
      const where = fullQuery ? '' : rangeWhere(min, max)
      return ok({
        stats: readStats(db, where),
        extra: readExtra(db, where),
        labels: readLabels(db, where)
      })
    } finally {
      db.close()
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message.includes('不存在')) return fail(ERR.DB_NOT_FOUND, '数据库文件不存在')
    return fail(ERR.INVALID_PATH, '路径不合法')
  }
})
