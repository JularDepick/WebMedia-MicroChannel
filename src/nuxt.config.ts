/* ============================================================
   Nuxt 配置
   ============================================================ */

/* 开发模式不指定产物目录, 避免运行开发服务器时清空已构建的 dist/ */
const isBuildCommand = !process.argv.includes('dev')

export default defineNuxtConfig({
  /* 关闭服务端渲染: 前端依赖 localStorage 与 DOM 尺寸测量,统一在客户端渲染 */
  ssr: false,

  compatibilityDate: '2026-01-01',

  devtools: { enabled: false },

  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
        { name: 'theme-color', content: '#ff6b35' },
        { name: 'mobile-web-app-capable', content: 'yes' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&family=Space+Mono:wght@400;700&display=swap'
        },
        { rel: 'icon', href: '/favicon.ico', type: 'image/x-icon' }
      ]
    }
  },

  runtimeConfig: {
    /* 服务端:频道数据库根目录与认证库路径,可由环境变量覆盖 */
    dbBaseDir: 'data/sqlitedb',
    authDbPath: 'data/auth.db',
    /* 跨域白名单,逗号分隔;留空表示仅允许同源 */
    corsOrigins: '',
    public: {
      /* 前端默认请求前缀,频道配置中的 backend 可覆盖为绝对地址 */
      apiBase: '/api'
    }
  },

  nitro: {
    /* node:sqlite 为 Node 运行时内置模块,不参与打包 */
    externals: { external: ['node:sqlite'] },
    /* 构建产物输出到项目根目录 dist/ */
    ...(isBuildCommand ? { output: { dir: '../dist' } } : {})
  }
})
