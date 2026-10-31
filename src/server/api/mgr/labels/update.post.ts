/* ============================================================
   更新标签
   POST { dbPath, dbName, id, labels }
   ============================================================ */

import { DatabaseSync } from 'node:sqlite'
import { guard, isGuardFailure } from '../../../utils/auth'
import { locateChannelDb } from '../../../utils/mgr-db'
import { MAX_LABEL_LENGTH, MAX_LABELS } from '../../../config/site'
import { initChannelDb } from '../../../utils/sqlite'
import { fail, ok, ERR } from '../../../utils/response'

interface UpdateBody {
  dbPath?: string
  dbName?: string
  id?: number
  labels?: unknown
}

export default defineEventHandler(async (event) => {
  const auth = guard(event, 'U')
  if (isGuardFailure(auth)) return auth.response

  const body = (await readBody<UpdateBody>(event).catch(() => ({}))) || {}
  const dbPath = String(body.dbPath || '').trim()
  const dbName = String(body.dbName || '').trim()
  const id = Math.floor(Number(body.id) || 0)

  if (!dbPath && !dbName) return fail(ERR.INVALID_PARAM, '数据库路径不能为空')
  if (id < 1) return fail(ERR.INVALID_PARAM, '无效的媒体ID')
  if (!Array.isArray(body.labels)) return fail(ERR.INVALID_PARAM, '标签必须为数组')

  const cleaned: string[] = []
  for (const raw of body.labels) {
    const label = String(raw ?? '').trim()
    if (label === '' || label.length > MAX_LABEL_LENGTH) continue
    if (cleaned.includes(label)) continue
    if (cleaned.length >= MAX_LABELS) break
    cleaned.push(label)
  }

  try {
    const target = locateChannelDb(dbPath, dbName, false)
    const db = new DatabaseSync(target.file)
    try {
      initChannelDb(db)
      const json = JSON.stringify(cleaned)
      db.prepare(`INSERT INTO media_labels (media_id, labels) VALUES (?, ?)
        ON CONFLICT(media_id) DO UPDATE SET labels = ?`).run(id, json, json)
      return ok({ id, labels: cleaned }, '更新成功')
    } finally {
      db.close()
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message.includes('不存在')) return fail(ERR.DB_NOT_FOUND, '数据库文件不存在')
    return fail(ERR.INVALID_PATH, '路径不合法')
  }
})
