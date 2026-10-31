# 源码目录说明

本目录是 Nuxt 4 项目根,前端与后端都在此实现。

## 目录结构

```
src/
├── app/                          # 客户端
│   ├── app.vue                   # 根组件
│   ├── assets/css/
│   │   ├── main.css              # 主站样式
│   │   └── mgr.css               # 管理端样式
│   ├── components/
│   │   ├── layout/               # 导航、侧栏、设置面板、信息栏、标签筛选
│   │   ├── media/                # 卡片、网格、全屏查看、播放器
│   │   └── ui/                   # 提示与下拉控件
│   ├── composables/              # 状态与业务组合式函数
│   ├── pages/
│   │   ├── index.vue             # 主站页面
│   │   └── mgr/                  # 管理端页面与密码生成器
│   └── utils/                    # 格式化与布局算法
├── server/                       # 服务端
│   ├── api/                      # 接口路由,按目录映射 URL
│   │   └── mgr/                  # 管理端接口
│   ├── config/site.ts            # 账户、权限位与查询配额
│   ├── middleware/cors.ts        # 跨域响应
│   └── utils/                    # 数据库、认证与响应封装
├── shared/                       # 前后端共享
│   ├── constants/                # 频道配置与站点常量
│   └── types/                    # 数据结构类型
├── public/                       # 原样拷贝的静态资源
├── nuxt.config.ts                # Nuxt 配置
├── package.json                  # 依赖与脚本
├── tsconfig.json                 # TypeScript 项目引用
└── .npmrc                        # 依赖源与缓存位置
```

## 模块职责

| 位置 | 职责 |
|:---:|:---:|
| `app/pages/index.vue` | 主站页面,承载频道浏览的全部交互 |
| `app/pages/mgr/index.vue` | 管理端,登录后查看统计与维护标签 |
| `app/pages/mgr/pwd.vue` | 密码生成器,产出与后端一致的摘要 |
| `app/composables/useStats.ts` | 统计与标签数据的拉取、缓存与增量合并 |
| `app/composables/useMediaLayout.ts` | 列容器构建、卡片分配与高度平衡 |
| `app/composables/usePlayer.ts` | 音频与视频播放器控制 |
| `app/utils/layout.ts` | 列宽与视窗比例等纯计算 |
| `server/api/data.post.ts` | 主站统一数据接口 |
| `server/api/mgr/` | 管理端接口,覆盖认证、统计、标签与数据库维护 |
| `server/utils/sqlite.ts` | 频道数据库打开、建表与区间扩容 |
| `server/utils/auth.ts` | 令牌签发、校验与权限位判定 |
| `shared/constants/channels.ts` | 频道配置,新增频道只需改这一处 |

## 数据存放

运行时数据固定在项目根目录的 `data/`,该目录不入库,也不会被构建清理。

- 频道数据库根目录: `data/sqlitedb/`
- 认证库: `data/auth.db`

数据根目录由 `runtimeConfig.dataDir` 指定(默认 `data`),可用环境变量 `WMMC_DATA_DIR` 覆盖;`WMMC_DB_DIR` 与 `WMMC_AUTH_DB` 可分别覆盖两个库的位置。

服务端从启动目录向上识别项目根,以 `src/package.json` 或 `dist/server/index.mjs` 为标记,因此从项目根、`src/` 或 `dist/` 启动都指向同一个 `data/`。

## 运行

```bash
npm install      # 安装依赖
npm run dev      # 开发服务器,默认 localhost:3000
npm run build    # 构建,产物输出到根目录 dist/
```

产物的启动方式为 `node dist/server/index.mjs`,监听端口由 `PORT` 环境变量指定。
