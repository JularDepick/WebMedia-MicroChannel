/* ============================================================
   频道列表
   直接读取共享频道配置,免去解析源文件
   ============================================================ */

import { CHANNEL_CONFIGS } from '~~/shared/constants/channels'
import { guard, isGuardFailure } from '../../utils/auth'
import { ok } from '../../utils/response'

export default defineEventHandler((event) => {
  const auth = guard(event, 'R')
  if (isGuardFailure(auth)) return auth.response

  const channels = CHANNEL_CONFIGS.map(channel => ({
    id: channel.id,
    name: channel.name,
    dbPath: channel.dbPath,
    dbName: channel.dbName,
    mediaType: channel.mediaType,
    mediaPrefix: channel.mediaPrefix,
    mediaExt: channel.mediaExt,
    mediaIdMin: channel.mediaIdMin,
    mediaIdMax: channel.mediaIdMax,
    mediaIdLength: channel.mediaIdLength
  }))

  return ok({ channels })
})
