<div align="center">

# WebMedia-MicroChannel

[![Version](https://img.shields.io/badge/Version-1.5.1-red)](https://github.com/JularDepick/WebMedia-MicroChannel/releases/tag/v1.5.1)
[![MIT](https://img.shields.io/badge/License-MIT-yellow)](./LICENSE/MIT)
[![Copyright](https://img.shields.io/badge/Copyright-JularDepick-0066AA)](./COPYRIGHT)

[[English]](./README.md)
[[简体中文]](./README_zh-CN.md)

</div>

一个极简、轻量的在线媒体浏览平台，以匿名方式帮你推广喜爱的内容。使用轻量级 PHP 后端存储交互数据。

## 功能特性

- **多频道支持**：通过左上角按钮切换不同频道，每个频道独立配置资源地址、数据库、公告内容等；切换频道时自动打断正在加载的媒体（图片/视频/音频），立即停止旧频道的网络请求
- **标签系统**：资源卡片顶部悬浮展示标签横幅（可关闭），标签数据存储于频道数据库，支持通过管理端进行增删改查
- **标签筛选**：导航栏"标签"tab 页支持按标签筛选媒体，支持完整匹配和部分匹配两种模式，多个标签取交集，按推荐公式排序
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
- **长按下拉菜单**：导航栏溢出按钮自动收纳入"更多"下拉控件，支持长按展开
- **移动端适配**：触控事件兼容，响应式布局
- **首次访问引导**：新用户首次访问时自动展示操作提示

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
│   ├── audios/             # 音频资源（gitignore）
│   └── mgr/                # 管理端（通过 /mgr/ 路径访问）
│       ├── index.html      # 管理端入口
│       ├── main.js         # 管理端逻辑
│       ├── style.css       # 管理端样式
│       ├── pwd.html        # 密码哈希生成工具
│       └── api/            # 管理端PHP API
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
php -S localhost:17891 -t src
```

浏览器访问 `http://localhost:17891`。

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

返回 `{ stats: [{id, views, likes, favorites},...], extra: [{id, downloads, shares, blocks},...], labels: [{id, labels: [...]},...] }`

### POST 请求

```
POST /api/data.php
Content-Type: application/json

{ "db": "xxx", "table": "stats", "action": "like", "id": 1 }
```

- `table`: `stats`（浏览/点赞/收藏）/ `extra`（下载/分享/屏蔽）
- `action`: `view` / `like` / `favorite` / `download` / `share` / `block` / `getLabels` / `setLabels`

## 管理端使用

管理端（`src/mgr/`）是独立于服务端的后台面板，用于查看频道数据统计和管理标签。

### 生成密码

1. 用浏览器打开 `src/mgr/pwd.html`
2. 输入盐值、用户名和密码，点击"生成哈希"
3. 将哈希值填入 `src/mgr/api/account.php` 对应账户中

### 访问管理端

管理端随主服务端启动，通过路径 `/mgr/` 访问：

```
http://localhost:17891/mgr/
```

### 操作流程

1. **登录**：输入 `account.php` 中配置的用户名和密码
2. **选择数据来源**：支持"服务端指定"（从 main.js 读取频道配置）和"同源数据库"（扫描数据库目录）两种模式
3. **选择频道**：点击频道卡片进入详情页
4. **数据统计**：查看浏览量、点赞、收藏、下载、分享、屏蔽等数据
5. **标签管理**：
   - 回车或逗号添加标签，退格删除最后一个标签，点击 x 移除指定标签
   - 支持"清空"（二次确认）和"保存"操作
   - 标签数量上限 10 个，单个标签最长 20 字符
6. 服务端前端在下次刷新数据时自动拉取标签并展示在卡片顶部

## 许可证

本项目采用 [MIT 许可证](./LICENSE/MIT)。

版权所有 &copy; 2026 [JularDepick](https://github.com/JularDepick/)，详见 [COPYRIGHT](./COPYRIGHT)。
