/* ============================================================
   扫描服务端数据库目录
   GET (需 Bearer Token)
   ============================================================ */

import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { guard, isGuardFailure } from '../../../utils/auth'
import { resolveDbDir } from '../../../utils/sqlite'
import { formatDateTime } from '../../../utils/mgr-db'
import { fail, ok, ERR } from '../../../utils/response'

interface DbFile {
  name: string
  path: string
  size: number
  mtime: string
}

function walk(dir: string, base: string, output: DbFile[]): void {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, item.name)
    if (item.isDirectory()) {
      walk(full, base, output)
      continue
    }
    if (!item.isFile() || !item.name.toLowerCase().endsWith('.db')) continue
    const info = statSync(full)
    output.push({
      name: item.name,
      path: relative(base, full).replace(/\\/g, '/'),
      size: info.size,
      mtime: formatDateTime(info.mtime)
    })
  }
}

export default defineEventHandler((event) => {
  const auth = guard(event, 'R')
  if (isGuardFailure(auth)) return auth.response

  try {
    const base = resolveDbDir('', false)
    const files: DbFile[] = []
    walk(base, base, files)
    files.sort((a, b) => a.name.localeCompare(b.name))
    return ok({ files })
  } catch {
    return fail(ERR.DB_DIR_MISSING, '数据库目录不存在或未配置')
  }
})
