<div align="center">

# WebMedia-MicroChannel

[![Version](https://img.shields.io/badge/Version-1.1-red)](https://github.com/JularDepick/WebMedia-MicroChannel/releases/tag/v1.1)
[![MIT](https://img.shields.io/badge/License-MIT-yellow)](./LICENSE/MIT)
[![Copyright](https://img.shields.io/badge/Copyright-JularDepick-0066AA)](./COPYRIGHT)

[[English]](./README.md)
[[简体中文]](./README_zh-CN.md)

</div>

一个极简、轻量的在线媒体浏览平台，以匿名方式帮你推广喜爱的内容。使用轻量级 PHP 后端存储交互数据。

## 功能特性

- **多频道支持**：通过左上角按钮切换不同频道，每个频道独立配置资源地址、数据库、公告内容等
- **分类浏览**：收藏、探索、首页、推荐、热门、高赞、精选、优质、乐享、敏感等多个标签页
- **自适应网格布局**：支持 1-5 列自由切换，卡片视窗比例可选（原图、16:9、4:3、1:1 等 12 种）
- **书签系统**：左侧栏新增/跳转/清空书签，快速定位内容
- **交互统计**：浏览量、点赞、收藏、下载、分享、屏蔽，数据持久化至 SQLite
- **懒加载**：图片、视频和音频按需加载，支持无限滚动
- **全屏查看**：点击媒体进入全屏，支持缩放和 1:1 原始尺寸
- **音频播放器**：自定义音频播放器，支持播放/暂停、进度条、音量控制、速度调节
- **视频播放器**：自定义视频播放器，支持播放控制、进度条、音量、速度设置
- **主题切换**：内置多套主题，设置面板一键切换
- **数据自动刷新**：可配置更新周期（10/30/60 分钟），支持手动立即更新
- **长按下拉菜单**：导航栏溢出按钮自动收纳入"更多"下拉控件，支持长按展开
- **移动端适配**：触控事件兼容，响应式布局
- **跨域媒体支持**：`crossOrigin = 'anonymous'`，兼容 OSS 等第三方资源服务

## 项目结构

```
WebMedia-MicroChannel/
├── src/
│   ├── index.html          # 主页面
│   ├── main.js             # 核心逻辑（UI、交互、数据管理）
│   ├── main.css            # 样式表
│   ├── favicon.ico         # 网站图标
│   ├── api/
│   │   ├── data.php        # 统一数据接口（GET/POST）
│   │   ├── db.php          # SQLite 数据库初始化
│   │   └── sqlitedb/       # SQLite 数据库文件目录
│   ├── images/             # 图片资源（gitignore）
│   ├── videos/             # 视频资源（gitignore）
│   └── audios/             # 音频资源（gitignore）
├── scripts/
│   ├── 图片人工审核.py       # 人工审核工具
│   ├── 批量自定义重命名.py   # 批量重命名工具
│   ├── 文件列表生成.py       # 文件列表生成
│   ├── 文件列表同步.py       # 文件列表同步
│   └── image-judge-config.ini # 图片审核配置
└── dist/                   # 构建输出
```

## 技术栈

- **前端**：原生 HTML / CSS / JavaScript（无框架依赖）
- **后端**：PHP + SQLite3
- **工具脚本**：Python

## 快速开始

### 环境要求

- PHP 7.4+（需启用 SQLite3 扩展）
- Web 服务器（Apache / Nginx / PHP 内置服务器）

### 本地运行

```bash
# 克隆仓库
git clone https://github.com/JularDepick/WebMedia-MicroChannel.git
cd WebMedia-MicroChannel

# 使用 PHP 内置服务器
php -S localhost:8080 -t src
```

浏览器访问 `http://localhost:8080`。

### 配置频道

编辑 `src/main.js` 中的 `CHANNEL_CONFIGS` 数组：

```js
{
  id: 'channel-id',
  name: '频道名称',
  nickname: '页面标题',
  announcement: '频道公告（支持 HTML）',
  backend: 'api/',              // API 路径
  dbPath: 'sqlitedb/path/',     // 数据库目录
  dbName: 'database.db',       // 数据库文件名
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

## API 接口

### GET 请求

```
GET /api/data.php?db=xxx&min=1&max=100
```

返回 `{ stats: [{id, views, likes, favorites},...], extra: [{id, downloads, shares, blocks},...] }`

### POST 请求

```
POST /api/data.php
Content-Type: application/json

{ "db": "xxx", "table": "stats", "action": "like", "id": 1 }
```

- `table`: `stats`（浏览/点赞/收藏）/ `extra`（下载/分享/屏蔽）
- `action`: `view` / `like` / `favorite` / `download` / `share` / `block`

## 许可证

本项目采用 [MIT 许可证](./LICENSE/MIT)。

版权所有 &copy; 2026 [JularDepick](https://github.com/JularDepick/)，详见 [COPYRIGHT](./COPYRIGHT)。
