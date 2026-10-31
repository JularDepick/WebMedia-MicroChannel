<div align="center">

# WebMedia-MicroChannel

[![Version](https://img.shields.io/badge/Version-2.0.0-red)](https://github.com/JularDepick/WebMedia-MicroChannel/releases/tag/v2.0.0)
[![MIT](https://img.shields.io/badge/License-MIT-yellow)](./LICENSE)
[![Copyright](https://img.shields.io/badge/Copyright-JularDepick-0066AA)](./COPYRIGHT)

[[English]](./README.md)
[[简体中文]](./README_zh-CN.md)

</div>

一个极简、轻量的在线媒体浏览平台，以匿名方式帮你推广喜爱的内容。前端与后端统一由 Nuxt 实现。

## 功能特性

- **多频道支持**：通过左上角按钮切换不同频道，每个频道独立配置资源地址、数据库、公告内容等；切换频道时自动打断正在加载的媒体（图片/视频/音频），立即停止旧频道的网络请求
- **标签系统**：资源卡片顶部悬浮展示标签横幅（可关闭），标签数据存储于频道数据库，支持通过管理端进行增删改查
- **标签筛选**：导航栏“标签”tab 页支持按标签筛选媒体，支持完整匹配和部分匹配两种模式，多个标签取交集，按推荐公式排序
- **分类浏览**：收藏、探索、首页、推荐、热门、高赞、精选、优质、乐享、敏感等多个标签页
- **自适应网格布局**：支持 1-5 列自由切换，卡片视窗比例可选（原图、16:9、4:3、1:1 等 12 种）
- **书签系统**：左侧栏新增/跳转/清空书签，快速定位内容
- **交互统计**：浏览量、点赞、收藏、下载、分享、屏蔽，数据持久化至 SQLite
- **懒加载**：图片、视频和音频按需加载，支持无限滚动
- **全屏查看**：点击媒体进入全屏，支持缩放和 1:1 原始尺寸
- **音频播放器**：自定义音频播放器，支持播放/暂停、进度条、音量控制、速度调节
- **视频播放器**：自定义视频播放器，支持播放控制、进度条、音量、速度设置
- **卡片内播放控件**：视频/音频卡片内嵌播放按钮、进度条、静音按钮，无需全屏即可操作
- **主题切换**：内置多套主题（简约白/黑、玫瑰红、可爱粉、夏日橙、古朴黄、初春绿、高原青、天空蓝、太空紫），设置面板一键切换
- **数据自动刷新**：可配置更新周期（10/30/60 分钟），支持手动立即更新
- **长按下拉菜单**：导航栏溢出按钮自动收纳为“更多”下拉控件，支持长按展开
- **移动端适配**：触控事件兼容，响应式布局
- **首次访问引导**：新用户首次访问时自动展示操作提示

## 技术栈

- **全栈框架**：Nuxt 4（前端与后端统一实现）
- **前端**：Vue 3 + TypeScript，组合式 API
- **服务端**：Nitro 文件路由
- **数据库**：SQLite（Node 内置 `node:sqlite`，无第三方驱动）
- **工具脚本**：Python 3

## 快速开始

### 环境要求

- Node.js 22.5 及以上（需内置 `node:sqlite`）

### 本地运行

```bash
git clone https://github.com/JularDepick/WebMedia-MicroChannel.git
cd WebMedia-MicroChannel/src
npm install
npm run dev
```

浏览器访问 `http://localhost:3000`。

### 构建部署

```bash
cd src
npm run build
node ../dist/server/index.mjs
```

构建产物输出到项目根目录 `dist/`，其中包含 Node 服务与静态资源。

### 配置频道

编辑 `src/shared/constants/channels.ts` 中的 `CHANNEL_CONFIGS` 数组：

```ts
{
  id: 'channel-id',
  name: '频道名称',
  nickname: '页面标题',
  announcement: '频道公告（支持 HTML）',
  backend: '/api/',            // 接口前缀，可填远程 Nuxt 后端绝对地址
  dbPath: 'cait/',             // 数据库目录，相对 src/data/sqlitedb
  dbName: 'channel.db',        // 数据库文件名
  tableName: 'media_data',     // 数据表名
  resourceUrl: 'images/',      // 资源 URL
  mediaPrefix: 'img-',         // 文件名前缀
  mediaIdLength: 4,            // ID 补零长度
  mediaIdMin: 1,               // 最小 ID
  mediaIdMax: 100,             // 最大 ID
  mediaExt: '.jpg',            // 文件扩展名
  mediaType: 'img'             // 媒体类型：img / video / audio
}
```

`backend` 既可以是同源相对路径，也可以指向远程部署的 Nuxt 后端；跨域访问需要在服务端运行配置 `corsOrigins` 中登记来源。

## 数据接口

### 读取数据

```
GET /api/data?db=cait20260609-0.db&dbPath=cait/&min=1&max=100
```

返回 `{ stats: [{id, views, likes, favorites},...], extra: [{id, downloads, shares, blocks},...], labels: [{id, labels: [...]},...] }`

### 写入交互

```
POST /api/data
Content-Type: application/json

{ "db": "cait20260609-0.db", "dbPath": "cait/", "table": "stats", "action": "like", "id": 1 }
```

- `table`: `stats`（浏览/点赞/收藏）/ `extra`（下载/分享/屏蔽）
- `action`: `view` / `like` / `favorite` / `download` / `share` / `block` / `getData` / `getLabels` / `setLabels`

## 管理端

管理端与主站同源部署，通过路径 `/mgr` 访问。

### 生成密码

1. 用浏览器打开 `/mgr/pwd`
2. 输入盐值、用户名和密码，点击“生成哈希”
3. 将哈希值填入 `src/server/config/site.ts` 的 `ADMIN_ACCOUNTS`

### 操作流程

1. **登录**：输入 `ADMIN_ACCOUNTS` 中配置的用户名和密码
2. **选择数据来源**：支持“服务端指定”（读取频道配置）和“同源数据库”（扫描数据库目录）两种模式
3. **选择频道**：点击频道卡片进入详情页
4. **数据统计**：查看浏览量、点赞、收藏、下载、分享、屏蔽等数据
5. **标签管理**：回车或逗号添加标签，退格删除最后一个标签，点击叉号移除指定标签，支持清空与保存，标签数量上限 10 个，单个标签最长 20 字符
6. 主站在下次刷新数据时自动拉取标签并展示在卡片顶部

## 许可证

本项目采用 [MIT 许可证](./LICENSE)。

版权所有 &copy; 2026 [JularDepick](https://github.com/JularDepick/)，详见 [COPYRIGHT](./COPYRIGHT)。
