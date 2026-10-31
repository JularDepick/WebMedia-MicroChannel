/* ============================================================
   主站数据读取接口
   GET ?dbPath=&db=&min=&max=
   ============================================================ */

import { loadChannelData } from '../utils/channel-data'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  try {
    return loadChannelData(String(query.dbPath || ''), String(query.db || 'media-cls0.db'), {
      min: Number(query.min) || 0,
      max: Number(query.max) || 0,
      fullQuery: false
    })
  } catch {
    setResponseStatus(event, 500)
    return { ok: false, error: 'internal server error' }
  }
})
