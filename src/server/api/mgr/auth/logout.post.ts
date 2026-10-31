/* ============================================================
   管理员登出
   POST (需 Bearer Token)
   ============================================================ */

import { guard, isGuardFailure, revokeToken } from '../../../utils/auth'
import { ok } from '../../../utils/response'

export default defineEventHandler((event) => {
  const auth = guard(event, 'R')
  if (isGuardFailure(auth)) return auth.response
  revokeToken(auth.username)
  return ok({}, '已登出')
})
