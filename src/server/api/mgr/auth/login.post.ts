/* ============================================================
   管理员登录
   POST { username, password }
   ============================================================ */

import { ADMIN_ACCOUNTS } from '../../../config/site'
import { hashPassword, issueToken } from '../../../utils/auth'
import { fail, ok, ERR } from '../../../utils/response'

interface LoginBody {
  username?: string
  password?: string
}

export default defineEventHandler(async (event) => {
  if (event.method !== 'POST') return fail(ERR.METHOD_NOT_ALLOWED, '请求方法不允许')

  const body = (await readBody<LoginBody>(event).catch(() => ({}))) || {}
  const username = String(body.username || '').trim()
  const password = String(body.password || '').trim()

  if (!username || !password) return fail(ERR.INVALID_PARAM, '用户名和密码不能为空')
  if (!ADMIN_ACCOUNTS[username]) return fail(ERR.BAD_CREDENTIAL, '用户名或密码错误')
  if (hashPassword(username, password) !== ADMIN_ACCOUNTS[username]) {
    return fail(ERR.BAD_CREDENTIAL, '用户名或密码错误')
  }

  const { token, deadline } = issueToken(username)
  return ok({ token, deadline, username }, '登录成功')
})
