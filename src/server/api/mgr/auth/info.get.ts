/* ============================================================
   当前用户信息与权限
   GET (需 Bearer Token)
   ============================================================ */

import { guard, isGuardFailure, permissionOf } from '../../../utils/auth'
import { ok } from '../../../utils/response'

export default defineEventHandler((event) => {
  const auth = guard(event, 'R')
  if (isGuardFailure(auth)) return auth.response
  return ok({ username: auth.username, permission: permissionOf(auth.username) })
})
