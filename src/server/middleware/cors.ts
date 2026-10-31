/* ============================================================
   跨域响应
   仅在配置了白名单时生效,便于前台可指向远程后端
   ============================================================ */

export default defineEventHandler((event) => {
  const raw = String(useRuntimeConfig().corsOrigins || '').trim()
  if (raw === '') return

  const allowList = raw.split(',').map(item => item.trim()).filter(Boolean)
  const origin = String(getHeader(event, 'origin') || '')
  const wildcard = allowList.includes('*')

  if (wildcard) {
    setHeader(event, 'Access-Control-Allow-Origin', '*')
  } else if (origin && allowList.includes(origin)) {
    setHeader(event, 'Access-Control-Allow-Origin', origin)
    setHeader(event, 'Vary', 'Origin')
  } else {
    return
  }

  setHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type, Authorization')
  setHeader(event, 'Access-Control-Max-Age', '86400')

  if (event.method === 'OPTIONS') {
    setResponseStatus(event, 204)
    return ''
  }
})
