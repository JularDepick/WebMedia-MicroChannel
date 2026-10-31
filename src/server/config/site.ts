/* ============================================================
   服务端站点常量
   可个性化修改的配置集中于此,便于维护
   ============================================================ */

/* 密码哈希盐值 */
export const PASSWORD_SALT = 'wmmc-mgr-2026'

/* 管理员账户: 用户名 => 密码哈希(由管理端密码生成器产出) */
export const ADMIN_ACCOUNTS: Record<string, string> = {
  root: '95318fb39d657f4499bf5e9d1a7d79726821deb10138d0a4da3919c04eb24971dddd3a0bcb643d27283417d749111fcd53a6beeadb77ea36414cd60510c30048',
  xjh: 'f4c66c95ddf3c4df084989d9e23c3b655e6f61a0624a0b17353e64dc4d597e46d625f31162fc95ef69c116eedd40992cba93aa0e0017395c37fae38e738f5d5b'
}

/* 权限映射: 用户名 => 四位权限编码(C D R U) */
export const USER_PERMISSIONS: Record<string, string> = {
  root: '1111',
  xjh: '1111'
}

/* Token 有效期(秒) */
export const TOKEN_TTL = 86400

/* 单次查询允许的最大行数 */
export const MAX_QUERY_ROWS = 10000

/* 数据库允许扩容的绝对上限 */
export const MAX_DB_ROWS = 100000

/* 标签数量上限与单个标签最大长度 */
export const MAX_LABELS = 10
export const MAX_LABEL_LENGTH = 20
