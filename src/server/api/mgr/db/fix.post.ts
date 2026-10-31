/* ============================================================
   修复频道数据库
   POST { dbPath, dbName }
   以三张表的最大编号为准补齐缺失行
   ============================================================ */

import { DatabaseSync } from 'node:sqlite'
import { guard, isGuardFailure } from '../../../utils/auth'
import { locateChannelDb } from '../../../utils/mgr-db'
import { alignChannelRows, initChannelDb, maxMediaId } from '../../../utils/sqlite'
import { fail, ok, ERR } from '../../../utils/response'

function count(db: DatabaseSync, table: string): number {
  const row = db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number } | undefined
  return row ? Number(row.c) : 0
}

export default defineEventHandler(async (event) => {
  const auth = guard(event, 'U')
  if (isGuardFailure(auth)) return auth.response

  const body = (await readBody<{ dbPath?: string, dbName?: string }>(event).catch(() => ({}))) || {}
  const dbPath = String(body.dbPath || '').trim()
  const dbName = String(body.dbName || '').trim()
  if (!dbPath && !dbName) return fail(ERR.INVALID_PARAM, '数据库路径不能为空')

  try {
    const target = locateChannelDb(dbPath, dbName, false)
    const db = new DatabaseSync(target.file)
    try {
      initChannelDb(db)
      const before = {
        stats: count(db, 'media_stats'),
        extra: count(db, 'media_extra'),
        labels: count(db, 'media_labels')
      }
      const maxId = maxMediaId(db)
      alignChannelRows(db, maxId)
      const after = {
        stats: count(db, 'media_stats'),
        extra: count(db, 'media_extra'),
        labels: count(db, 'media_labels')
      }
      return ok({
        before,
        after,
        filled: {
          stats: after.stats - before.stats,
          extra: after.extra - before.extra,
          labels: after.labels - before.labels
        },
        maxId
      }, '修复完成')
    } finally {
      db.close()
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message.includes('不存在')) return fail(ERR.DB_NOT_FOUND, '数据库文件不存在')
    return fail(ERR.INVALID_PATH, '路径不合法')
  }
})
