/* ============================================================
   站点常量
   ============================================================ */

/* 全局页面标题,频道 nickname 为空时使用 */
export const PAGE_TITLE = '在线媒体微频道'

/* 站点描述 */
export const SITE_DESCRIPTION = '在线媒体微频道 - 极简在线媒体浏览平台，支持图片、视频、音频浏览，提供点赞、收藏、分享等社交功能'

/* 主题色 */
export const THEME_COLOR = '#ff6b35'

/* 调试日志开关 */
export const DEBUG = false

/* 首次访问引导 */
export const ENABLE_FIRST_VISIT_GUIDE = true
export const GUIDE_ANNOUNCEMENT = '网站作品刚刚上线缺少活跃数据，大家给自己喜欢的图片点点赞吧'

/* 作者信息,渲染于页面底部 */
export const AUTHOR_INFO = {
  name: 'JularDepick',
  url: 'https://github.com/JularDepick',
  project: 'WebMedia-MicroChannel',
  projectUrl: 'https://github.com/JularDepick/WebMedia-MicroChannel'
} as const

/* 项目版本号 */
export const PROJECT_VERSION = '2.0.0'

/* 每列默认卡片数,用于分页 */
export const ROWS_PER_PAGE = 3

/* 视窗比例选项 */
export const RATIO_OPTIONS = [
  { key: 'original', label: '原图' },
  { key: '2:1', label: '2:1' },
  { key: '16:9', label: '16:9' },
  { key: '3:2', label: '3:2' },
  { key: '4:3', label: '4:3' },
  { key: '5:4', label: '5:4' },
  { key: '1:1', label: '1:1' },
  { key: '4:5', label: '4:5' },
  { key: '3:4', label: '3:4' },
  { key: '2:3', label: '2:3' },
  { key: '9:16', label: '9:16' },
  { key: '1:2', label: '1:2' }
] as const

/* 数据更新周期选项(毫秒) */
export const CACHE_CYCLE_OPTIONS = [
  { value: 600000, label: '10m' },
  { value: 1800000, label: '30m' },
  { value: 3600000, label: '60m' }
] as const
