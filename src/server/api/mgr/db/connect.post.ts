/* ============================================================
   连接频道数据库
   POST { dbPath }
   ============================================================ */

import { DatabaseSync } from 'node:sqlite'
import { guard, isGuardFailure } from '../../../utils/auth'
import { requireChannelDbFile } from '../../../utils/mgr-db'
import { fail, ok, ERR } from '../../../utils/response'

export default defineEventHandler(async (event) => {
  const auth = guard(event, 'R')
  if (isGuardFailure(auth)) return auth.response

  const body = (await readBody<{ dbPath?: string }>(event).catch(() => ({}))) || {}
  const dbPath = String(body.dbPath || '').trim()
  if (!dbPath) return fail(ERR.INVALID_PARAM, '数据库路径不能为空')

  try {
    const target = requireChannelDbFile(dbPath, '')
    const db = new DatabaseSync(target.file, { readOnly: true })
    try {
      const rows = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>
      return ok({ dbPath, tables: rows.map(row => row.name) }, '连接成功')
    } finally {
      db.close()
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message.includes('not found') || message.includes('不存在')) {
      return fail(ERR.DB_NOT_FOUND, '数据库文件不存在')
    }
    return fail(ERR.INVALID_PATH, '路径不合法')
  }
})
