/* ============================================================
   频道配置
   修改频道只需维护本文件
   ============================================================ */

import type { ChannelConfig } from '../types/channel'

/* 两个频道共用的竞赛公告 */
const ANNOUNCEMENT = [
  '本项目为CAIT组织的 “AI织页,视呈万象” 创意竞赛参赛作品<br>',
  '开发与调试：<a href="https://github.com/JularDepick/">李文芳</a>、',
  '<a href="https://claude.com"><img src="https://img.shields.io/badge/Claude_Code-orange?style=flat&logo=claude&logoColor=white" title="Claude官网"/></a>、',
  '<a href="https://platform.xiaomimimo.com"><img src="https://img.shields.io/badge/XiaomiMiMo-grey?style=flat&logo=xiaomi&logoColor=white" title="XiaomiMiMo官网"/></a><br>',
  '图片资源审核：<a href="https://github.com/protect408/">徐健豪</a>、<a href="https://github.com/PQX-666/">彭启轩</a><br>',
  '开源地址：<a href="https://github.com/JularDepick/WebMedia-MicroChannel">',
  '<img src="https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white" title="GitHub仓库地址"/></a><br>',
  '发现高危漏洞请报告：<a href="mailto:JudeBlack@qq.com">JudeBlack@qq.com</a><br>',
  '<b>操作教程：左上角按钮切换频道，探索页随机加载图片，推荐页及其后继页面按热门排序，长按最后一个按钮展开隐藏，左上角侧栏使用书签功能，右上角设置调整显示</b><br>',
  '<font color="red"><b>*重要声明：媒体资源均来源于互联网，经过严格的人工审核，无不良引导，请注意甄别，非盈利性质，如侵权请联系删除</b></font><br>',
  '<br><img src="https://visitor-badge.laobi.icu/badge?page_id=wmmc2026-views&left_text=views"/>'
].join('')

export const CHANNEL_CONFIGS: ChannelConfig[] = [
  {
    id: 'aaaaaaa0',
    name: '写真',
    nickname: 'CAIT-AI创意竞赛-WMMC团队参赛作品-在线媒体微频道',
    announcement: ANNOUNCEMENT,
    iconSrc: '',
    useTheme: null,
    useColCount: null,
    useRatio: null,
    backend: '/api/',
    dbPath: 'cait/',
    dbName: 'cait20260609-0.db',
    tableName: 'media_data',
    resourceUrl: 'https://wencue-icu-images-20260608.oss-cn-chengdu.aliyuncs.com/beauty/',
    mediaPrefix: 'beauty-',
    mediaIdLength: 4,
    mediaIdMin: 1,
    mediaIdMax: 157,
    mediaExt: '.jpg',
    mediaType: 'img'
  },
  {
    id: 'aaaaaaa1',
    name: '童年',
    nickname: 'CAIT-AI创意竞赛-WMMC团队参赛作品-在线媒体微频道',
    announcement: ANNOUNCEMENT,
    iconSrc: '',
    useTheme: null,
    useColCount: null,
    useRatio: null,
    backend: '/api/',
    dbPath: 'cait/',
    dbName: 'cait20260609-1.db',
    tableName: 'media_data',
    resourceUrl: 'https://wencue-icu-images-20260608.oss-cn-chengdu.aliyuncs.com/videos/',
    mediaPrefix: 'vd-',
    mediaIdLength: 2,
    mediaIdMin: 1,
    mediaIdMax: 3,
    mediaExt: '.mp4',
    mediaType: 'video'
  }
]
