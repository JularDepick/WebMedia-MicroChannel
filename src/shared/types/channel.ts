/* ============================================================
   频道配置类型定义
   ============================================================ */

export type MediaType = 'img' | 'video' | 'audio'

export interface ChannelConfig {
  /* 唯一标识,用于浏览器存储隔离 */
  id: string
  /* 频道名称 */
  name: string
  /* 页面标题,空则使用全局标题 */
  nickname: string
  /* 频道公告,支持 HTML */
  announcement: string
  /* 频道图标,空则不修改页面图标 */
  iconSrc: string
  /* 频道主题索引, null 表示不覆盖 */
  useTheme: number | null
  /* 频道视图列数, null 表示不覆盖 */
  useColCount: number | null
  /* 频道视窗比例, null 表示不覆盖 */
  useRatio: string | null
  /* 后端接口地址,可为相对路径或远程绝对地址 */
  backend: string
  /* 数据库目录,相对后端数据根目录 */
  dbPath: string
  /* 数据库文件名 */
  dbName: string
  /* 数据表名,保留兼容 */
  tableName: string
  /* 资源地址前缀 */
  resourceUrl: string
  /* 资源文件名前缀 */
  mediaPrefix: string
  /* 资源编号位数 */
  mediaIdLength: number
  /* 资源编号下限 */
  mediaIdMin: number
  /* 资源编号上限 */
  mediaIdMax: number
  /* 资源文件后缀 */
  mediaExt: string
  /* 资源类型 */
  mediaType: MediaType
}

export interface StatsRecord {
  id: number
  views: number
  likes: number
  favorites: number
}

export interface ExtraRecord {
  id: number
  downloads: number
  shares: number
  blocks: number
}

export interface LabelRecord {
  id: number
  labels: string[]
}

export interface ChannelDataPayload {
  stats: StatsRecord[]
  extra: ExtraRecord[]
  labels: LabelRecord[]
}

export interface CountItem {
  id: number
  count: number
}

export type TabKey =
  | 'favorites' | 'labeled' | 'explore' | 'home' | 'recommend'
  | 'hot' | 'topliked' | 'featured' | 'best' | 'shared' | 'sensitive'
