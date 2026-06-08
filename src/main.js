/* ============================================================
   在线资源浏览 - main.js
   ============================================================ */

(function () {
  'use strict';

  /* ---------- localStorage 工具 ---------- */
  const storage = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v !== null ? JSON.parse(v) : fallback;
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    }
  };

  /* ---------- 常量 ---------- */
  const PAGE_TITLE = '在线资源浏览';  // 页面标题


  const DEBUG = true;                // 是否输出调试消息


  // 生成8位随机hex ID
  function genId() {
    return Math.random().toString(16).slice(2, 10);
  }

  // 频道配置列表（开发者可添加多个频道）
  const CHANNEL_CONFIGS = [
    {
      id: 'a1b2c3d4',              // 唯一标识（8位hex），用于浏览器储存隔离
      name: '默认源',               // 频道名称
      nickname: '',                 // 频道昵称（覆盖页面标题，空则使用PAGE_TITLE）
      announcement: '',             // 频道公告（覆盖公告内容，空则使用ANNOUNCEMENT）
      iconSrc: '',                  // 频道图标（覆盖页面favicon，空则不修改）
      useTheme: null,               // 频道主题索引（覆盖浏览器储存，null=不覆盖）
      useColCount: null,            // 频道视图列数（覆盖浏览器储存，null=不覆盖）
      useRatio: null,               // 频道视窗比例（覆盖浏览器储存，null=不覆盖）
      backend: 'https://wencue.icu/api/WebIMG/', // 后端API地址
      dbPath: '',                   // 数据库文件目录（相对于PHP脚本目录，空=PHP同目录）
      dbName: 'media-cls0.db',     // SQLite数据库名
      tableName: 'media_data',     // 数据库表名
      resourceUrl: 'images/',      // 资源地址
      mediaPrefix: 'beauty-',        // 文件名称前缀
      mediaIdLength: 3,            // 文件编号位数
      mediaIdMin: 1,               // 文件编号下限
      mediaIdMax: 100,              // 文件编号上限
      mediaExt: '.jpg',            // 资源文件后缀名
      mediaType: 'img'             // 媒体类型：'img' / 'video' / 'audio'
    },
    {
      id: 'b2c3d4e5',
      name: '美女视频',
      nickname: '',
      announcement: '',
      iconSrc: '',
      useTheme: null,
      useColCount: null,
      useRatio: null,
      backend: 'https://wencue.icu/api/WebIMG/',
      dbPath: '',
      dbName: 'media-cls1.db',
      tableName: 'media_data',
      resourceUrl: 'videos/',
      mediaPrefix: 'vd-',
      mediaIdLength: 2,
      mediaIdMin: 1,
      mediaIdMax: 5,
      mediaExt: '.mp4',
      mediaType: 'video'
    }
  ];

  let channelIndex = storage.get('channelIndex', 0);
  channelIndex = Math.max(0, Math.min(CHANNEL_CONFIGS.length - 1, channelIndex));
  // 坐标是否在元素可视范围内（兼容body-append的下拉元素）
  function isPointInElement(x, y, el) {
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  function cfg() { return CHANNEL_CONFIGS[channelIndex]; }

  // 频道隔离的存储键前缀（基于频道id，非数组索引）
  function cfgKey(key) { return 'cfg_' + cfg().id + '_' + key; }

  // 主题颜色键预设顺序（colors数组按此顺序一一对应）
  const THEME_KEYS = [
    '--bg-primary', '--bg-secondary', '--bg-tertiary', '--bg-card',
    '--text-primary', '--text-secondary', '--text-muted',
    '--accent', '--accent-hover', '--accent-dim',
    '--border', '--border-light',
    '--shadow-sm', '--shadow-md', '--shadow-lg',
    '--color-scheme'
  ];

  // 主题配置列表（colors为hex值数组，按THEME_KEYS顺序对应）
  const THEMES = [
    {
      name: '简约白', value: 'light',
      colors: [
        '#f0f0f2', '#ffffff', '#e8e8ec', '#ffffff',
        '#1a1a1e', '#666666', '#aaaaaa',
        '#ff6b35', '#e55a28', 'rgba(255,107,53,0.12)',
        '#dddde0', '#cccccc',
        '0 2px 8px rgba(0,0,0,0.08)', '0 4px 20px rgba(0,0,0,0.12)', '0 8px 40px rgba(0,0,0,0.18)',
        'light'
      ]
    },
    {
      name: '简约黑', value: 'dark',
      colors: [
        '#0a0a0b', '#141416', '#1e1e22', '#1a1a1e',
        '#e8e6e3', '#9a9a9a', '#5a5a5a',
        '#ff6b35', '#ff8555', 'rgba(255,107,53,0.15)',
        '#2a2a2e', '#333338',
        '0 2px 8px rgba(0,0,0,0.3)', '0 4px 20px rgba(0,0,0,0.5)', '0 8px 40px rgba(0,0,0,0.7)',
        'dark'
      ]
    },
    {
      name: '玫瑰红', value: 'rose',
      colors: [
        '#f4e8ea', '#fef6f7', '#e8ccd2', '#fef6f7',
        '#2a0810', '#8a2838', '#b06878',
        '#b81838', '#d02048', 'rgba(184,24,56,0.12)',
        '#d8b8c0', '#e0c4cc',
        '0 2px 8px rgba(0,0,0,0.08)', '0 4px 20px rgba(0,0,0,0.12)', '0 8px 40px rgba(0,0,0,0.18)',
        'light'
      ]
    },
    {
      name: '可爱粉', value: 'pink',
      colors: [
        '#fdf4f8', '#fef7fb', '#f8dce8', '#fef7fb',
        '#2a0818', '#b06080', '#d0a0b8',
        '#f060a0', '#ff78b0', 'rgba(240,96,160,0.12)',
        '#f0c8d8', '#f4d4e0',
        '0 2px 8px rgba(0,0,0,0.06)', '0 4px 20px rgba(0,0,0,0.1)', '0 8px 40px rgba(0,0,0,0.15)',
        'light'
      ]
    },
    {
      name: '夏日橙', value: 'summerorange',
      colors: [
        '#fff8f0', '#fffbf7', '#ffe8d0', '#fffbf7',
        '#2a1808', '#b06820', '#d0a060',
        '#f07020', '#ff8838', 'rgba(240,112,32,0.12)',
        '#f0d8c0', '#f4e0cc',
        '0 2px 8px rgba(0,0,0,0.06)', '0 4px 20px rgba(0,0,0,0.1)', '0 8px 40px rgba(0,0,0,0.15)',
        'light'
      ]
    },
    {
      name: '古朴黄', value: 'orange',
      colors: [
        '#faf6ee', '#fffcf5', '#f0e8d0', '#fffcf5',
        '#2a2008', '#907020', '#b8a060',
        '#c08020', '#d89830', 'rgba(192,128,32,0.12)',
        '#e4d8b8', '#ece0c4',
        '0 2px 8px rgba(0,0,0,0.06)', '0 4px 20px rgba(0,0,0,0.1)', '0 8px 40px rgba(0,0,0,0.15)',
        'light'
      ]
    },
    {
      name: '初春绿', value: 'springgreen',
      colors: [
        '#f0f8f0', '#f5fcf5', '#d8f0d8', '#f5fcf5',
        '#0a200a', '#308030', '#80b080',
        '#28a030', '#38b840', 'rgba(40,160,48,0.12)',
        '#b8d8b8', '#c8e0c8',
        '0 2px 8px rgba(0,0,0,0.06)', '0 4px 20px rgba(0,0,0,0.1)', '0 8px 40px rgba(0,0,0,0.15)',
        'light'
      ]
    },
    {
      name: '高原青', value: 'plateau',
      colors: [
        '#eef8f8', '#f4fbfa', '#d0ece8', '#f4fbfa',
        '#082820', '#208878', '#70b0a8',
        '#189888', '#28b0a0', 'rgba(24,152,136,0.12)',
        '#b0d8d0', '#c0e0d8',
        '0 2px 8px rgba(0,0,0,0.06)', '0 4px 20px rgba(0,0,0,0.1)', '0 8px 40px rgba(0,0,0,0.15)',
        'light'
      ]
    },
    {
      name: '天空蓝', value: 'blue',
      colors: [
        '#f0f6fc', '#f5f9fe', '#dce8f8', '#f5f9fe',
        '#0a1828', '#3070b0', '#88a8d0',
        '#2080e0', '#3890f0', 'rgba(32,128,224,0.12)',
        '#b8d0e8', '#c8dcf0',
        '0 2px 8px rgba(0,0,0,0.06)', '0 4px 20px rgba(0,0,0,0.1)', '0 8px 40px rgba(0,0,0,0.15)',
        'light'
      ]
    },
    {
      name: '太空紫', value: 'purple',
      colors: [
        '#f4f0fa', '#f9f6fd', '#e4d8f4', '#f9f6fd',
        '#18082a', '#7040a0', '#a888c8',
        '#8030c0', '#9848d8', 'rgba(128,48,192,0.12)',
        '#d0b8e8', '#dcc8f0',
        '0 2px 8px rgba(0,0,0,0.06)', '0 4px 20px rgba(0,0,0,0.1)', '0 8px 40px rgba(0,0,0,0.15)',
        'light'
      ]
    }
  ];

  let themeIndex = storage.get('themeIndex', 0);
  themeIndex = Math.max(0, Math.min(THEMES.length - 1, themeIndex));
  function thm() { return THEMES[themeIndex]; }

  // 公告内容（跨tab同步）
  const ANNOUNCEMENT = '欢迎访问在线资源浏览，海量高清资源等你探索！';

  // 各tab说明
  const TAB_DESCRIPTIONS = {
    favorites: '查看你收藏的资源',
    explore: '随机发现资源，每次都有新惊喜',
    home: '按编号顺序浏览全部资源',
    recommend: '综合权值推荐：(浏览+点赞×2+收藏×3+下载×3+分享×2-屏蔽×5)/15',
    hot: '按浏览量降序排序',
    topliked: '按点赞量降序排序',
    featured: '按收藏量降序排序',
    best: '按下载量降序排序',
    shared: '按分享量降序排序',
    sensitive: '按屏蔽量降序排序'
  };

  /* ---------- 状态 ---------- */
  let initializing = true;           // 初始化阶段标志
  let currentTab = storage.get('currentTab', 'home');
  let tabBarBtn = null;
  let currentPage = 0;
  let scrollPauseLoad = false; // 快速滚动时暂停加载

  /* ============================================================
     设备环境检测（基于特性检测，不依赖UA）
     ============================================================ */
  const DeviceEnv = (() => {
    const TYPE = { MOBILE: 'mobile', TABLET: 'tablet', DESKTOP: 'desktop' };

    // 媒体查询
    const mq = {
      narrow:    window.matchMedia('(max-width: 767px)'),
      medium:    window.matchMedia('(min-width: 768px) and (max-width: 1024px)'),
      wide:      window.matchMedia('(min-width: 1025px)'),
      coarse:    window.matchMedia('(pointer: coarse)'),
      fine:      window.matchMedia('(pointer: fine)'),
      hover:     window.matchMedia('(hover: hover)'),
      noHover:   window.matchMedia('(hover: none)'),
      anyCoarse: window.matchMedia('(any-pointer: coarse)'),
      anyFine:   window.matchMedia('(any-pointer: fine)'),
    };

    function detect() {
      const w = window.innerWidth;
      const hasTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
      const primaryCoarse = mq.coarse.matches;
      const primaryFine = mq.fine.matches;
      const canHover = mq.hover.matches;
      const hasFinePointer = mq.anyFine.matches;

      // 手机：主指针粗糙 + 不支持悬停 + 窄屏
      if (primaryCoarse && !canHover && w <= 768) return TYPE.MOBILE;
      // 平板：主指针粗糙 + 不支持悬停 + 中等屏幕
      if (primaryCoarse && !canHover && w <= 1024) return TYPE.TABLET;
      // 平板横屏：粗糙指针 + 宽屏 + 触摸设备
      if (primaryCoarse && hasTouch && !hasFinePointer) return TYPE.TABLET;
      // 窄桌面（用户缩小窗口）：精细指针 + 支持悬停 → 保持桌面模式
      if (primaryFine && canHover) return TYPE.DESKTOP;
      // 混合设备（如触屏笔记本）：有精细指针 → 偏桌面
      if (hasFinePointer) return TYPE.DESKTOP;
      // 兜底：有触摸 → 平板，否则桌面
      return hasTouch ? TYPE.TABLET : TYPE.DESKTOP;
    }

    let currentType = detect();
    const listeners = [];

    function notify() {
      const newType = detect();
      if (newType !== currentType) {
        currentType = newType;
        document.documentElement.dataset.device = currentType;
        listeners.forEach(fn => fn(currentType));
      }
    }

    // 监听所有媒体查询变化
    Object.values(mq).forEach(m => m.addEventListener('change', notify));
    window.addEventListener('resize', () => notify(), { passive: true });

    // 初始写入 data-device
    document.documentElement.dataset.device = currentType;

    return {
      get type() { return currentType; },
      isMobile()  { return currentType === TYPE.MOBILE; },
      isTablet()  { return currentType === TYPE.TABLET; },
      isDesktop() { return currentType === TYPE.DESKTOP; },
      isTouch()   { return mq.coarse.matches || ('ontouchstart' in window); },
      subscribe(fn) { listeners.push(fn); },
    };
  })();

  function isMobile() { return DeviceEnv.isMobile(); }

  const defaultCols = isMobile() ? 2 : 3;
  const minCols = 1;
  let maxCols = isMobile() ? 2 : 5;
  let colCount = storage.get('colCount', defaultCols);
  colCount = Math.max(minCols, Math.min(maxCols, colCount));

  // 视窗比例
  const RATIO_MAP = {
    '2:1': 50,      '3:2': 66.67,   '4:3': 75,      '5:4': 80,      '16:9': 56.25,
    '1:1': 100,
    '1:2': 200,     '2:3': 150,     '3:4': 133.33,  '4:5': 125,     '9:16': 177.78,
  };
  let mediaRatio = storage.get('mediaRatio', isMobile() ? '1:1' : 'original');

  // 每页加载行数（卡片总数 = ROWS_PER_PAGE * colCount）
  const ROWS_PER_PAGE = 3;
  let CARDS_PER_PAGE = ROWS_PER_PAGE * colCount;

  // 全局卡片DOM缓存：资源编号 → 卡片DOM元素（绑定当前频道，刷新后丢失）
  const cardDomCache = {};
  // 各tab已加载的资源ID顺序（按加载顺序，用于列重建）
  const tabCardOrder = {};

  // 热门/高赞/精选数据缓存
  let hotData = null;       // [{id, count}, ...] 按浏览量
  let topLikedData = null;  // [{id, count}, ...] 按点赞数
  let featuredData = null;  // [{id, count}, ...] 按收藏数
  let downloadsData = null; // [{id, count}, ...] 按下载量
  let sharesData = null;    // [{id, count}, ...] 按分享量
  let blocksData = null;    // [{id, count}, ...] 按屏蔽量

  // 全屏状态
  let fsScale = 1;
  let fsTranslateX = 0;
  let fsTranslateY = 0;
  let fsDragging = false;
  let fsDragStart = { x: 0, y: 0 };

  /* ---------- DOM 缓存 ---------- */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dom = {
    sidebar: $('#sidebar'),
    sidebarExpand: $('#sidebarExpand'),
    btnBackTop: $('#btnBackTop'),
    btnPrevTag: $('#btnPrevTag'),
    btnAddTag: $('#btnAddTag'),
    btnNextTag: $('#btnNextTag'),
    btnClearTags: $('#btnClearTags'),
    tabNav: $('#tabNav'),
    colSwitch: $('#colSwitch'),
    settingsToggle: $('#settingsToggle'),
    settingsPanel: $('#settingsPanel'),
    settingsClose: $('#settingsClose'),
    channelSwitch: $('#channelSwitch'),
    themeSwitch: $('#themeSwitch'),
    ratioSwitch: $('#ratioSwitch'),
    cacheCycleSwitch: $('#cacheCycleSwitch'),
    btnForceRefresh: $('#btnForceRefresh'),
    gridContainer: $('#gridContainer'),
    announcementBar: $('#announcementBar'),
    descriptionBar: $('#descriptionBar'),
    loadIndicator: $('#loadIndicator'),
    noMore: $('#noMore'),
    tagLayer: $('#tagLayer'),
    fullscreenModal: $('#fullscreenModal'),
    fullscreenClose: $('#fullscreenClose'),
    fullscreenMedia: $('#fullscreenMedia'),
    zoomIn: $('#zoomIn'),
    zoomOut: $('#zoomOut'),
    zoomReset: $('#zoomReset'),
    mainContent: $('#mainContent'),
  };

  /* ============================================================
     工具函数
     ============================================================ */

  const DBG_STYLES = {
    '系统初化': 'color:#8B5CF6;font-weight:bold',
    '后端通信': 'color:#10B981;font-weight:bold',
    '用户操作': 'color:#F59E0B;font-weight:bold',
    '页面加载': 'color:#3B82F6;font-weight:bold',
    '布局变化': 'color:#EC4899;font-weight:bold',
    '卡片缓存': 'color:#06B6D4;font-weight:bold',
    '储存变更': 'color:#F97316;font-weight:bold',
    '书签管理': 'color:#A78BFA;font-weight:bold',
    'warn': 'color:#F59E0B;font-weight:bold',
    'error': 'color:#EF4444;font-weight:bold;font-style:italic',
  };
  function dbg(cat, text, data) {
    if (!DEBUG) return;
    const style = DBG_STYLES[cat] || 'color:#888';
    if (data !== undefined) {
      console.log('%c[' + cat + ']%c ' + text, style, 'color:inherit', data);
    } else {
      console.log('%c[' + cat + ']%c ' + text, style, 'color:inherit');
    }
  }
  function dbgW(cat, text, data) {
    if (!DEBUG) return;
    const style = DBG_STYLES['warn'];
    if (data !== undefined) {
      console.warn('%c[' + cat + ']%c ' + text, style, 'color:inherit', data);
    } else {
      console.warn('%c[' + cat + ']%c ' + text, style, 'color:inherit');
    }
  }
  function dbgE(cat, text, data) {
    if (!DEBUG) return;
    const style = DBG_STYLES['error'];
    if (data !== undefined) {
      console.error('%c[' + cat + ']%c ' + text, style, 'color:inherit', data);
    } else {
      console.error('%c[' + cat + ']%c ' + text, style, 'color:inherit');
    }
  }

  function padId(n) {
    return String(n).padStart(cfg().mediaIdLength, '0');
  }

  function mediaPath(id) {
    return cfg().resourceUrl + cfg().mediaPrefix + padId(id) + cfg().mediaExt;
  }

  function showToast(msg, duration = 2000) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
  }

  /* ---------- 快速排序 ---------- */
  function quickSort(arr, compareFn) {
    if (arr.length <= 1) return arr;
    const pivot = arr[Math.floor(arr.length / 2)];
    const left = [], middle = [], right = [];
    for (const item of arr) {
      const cmp = compareFn(item, pivot);
      if (cmp < 0) left.push(item);
      else if (cmp > 0) right.push(item);
      else middle.push(item);
    }
    return [...quickSort(left, compareFn), ...middle, ...quickSort(right, compareFn)];
  }

  /* ---------- 格式化数字 ---------- */
  function formatCount(n) {
    if (n >= 10000000) return (n / 10000000).toFixed(1) + 'kw';
    if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }

  /* ============================================================
     localStorage 数据管理（预加载到JS变量）
     ============================================================ */

  // 点赞A列表：当前点赞状态，可增删
  let _likes = storage.get(cfgKey('likes'), []);
  function getLikes() { return _likes; }
  function setLikes(arr) { _likes = arr; storage.set(cfgKey('likes'), arr); }
  function isLiked(id) { return _likes.includes(id); }

  // 点赞B列表：已通知后端的记录，只能增不能删
  let _likesNotified = storage.get(cfgKey('likesNotified'), []);
  function isLikeNotified(id) { return _likesNotified.includes(id); }
  function markLikeNotified(id) {
    if (!_likesNotified.includes(id)) {
      _likesNotified.push(id);
      storage.set(cfgKey('likesNotified'), _likesNotified);
    }
  }

  function toggleLike(id) {
    if (_likes.includes(id)) {
      _likes = _likes.filter(x => x !== id);
      setLikes(_likes);
      return false;
    } else {
      _likes.push(id);
      setLikes(_likes);
      return true;
    }
  }

  // 收藏A列表：当前收藏状态，可增删
  let _favorites = storage.get(cfgKey('favorites'), []);
  function getFavorites() { return _favorites; }
  function setFavorites(arr) { _favorites = arr; storage.set(cfgKey('favorites'), arr); }
  function isFavorited(id) { return _favorites.includes(id); }

  // 收藏B列表：已通知后端的收藏记录，只能增不能删
  let _favsNotified = storage.get(cfgKey('favsNotified'), []);
  function isFavNotified(id) { return _favsNotified.includes(id); }
  function markFavNotified(id) {
    if (!_favsNotified.includes(id)) {
      _favsNotified.push(id);
      storage.set(cfgKey('favsNotified'), _favsNotified);
    }
  }

  // 分享B列表：已通知后端的分享记录，只能增不能删
  let _sharesNotified = storage.get(cfgKey('sharesNotified'), []);
  function isShareNotified(id) { return _sharesNotified.includes(id); }
  function markShareNotified(id) {
    if (!_sharesNotified.includes(id)) {
      _sharesNotified.push(id);
      storage.set(cfgKey('sharesNotified'), _sharesNotified);
    }
  }

  // 下载B列表：已通知后端的下载记录，只能增不能删
  let _downloadsNotified = storage.get(cfgKey('downloadsNotified'), []);
  function isDownloadNotified(id) { return _downloadsNotified.includes(id); }
  function markDownloadNotified(id) {
    if (!_downloadsNotified.includes(id)) {
      _downloadsNotified.push(id);
      storage.set(cfgKey('downloadsNotified'), _downloadsNotified);
    }
  }

  // 屏蔽A列表：当前屏蔽状态，可增删
  let _blocks = storage.get(cfgKey('blocks'), []);
  function getBlocks() { return _blocks; }
  function setBlocks(arr) { _blocks = arr; storage.set(cfgKey('blocks'), arr); }
  function isBlocked(id) { return _blocks.includes(id); }
  function blockMedia(id) {
    if (!_blocks.includes(id)) {
      _blocks.push(id);
      setBlocks(_blocks);
    }
  }
  function unblockMedia(id) {
    _blocks = _blocks.filter(x => x !== id);
    setBlocks(_blocks);
  }

  // 屏蔽B列表：已通知后端的屏蔽记录，只能增不能删
  let _blocksNotified = storage.get(cfgKey('blocksNotified'), []);
  function isBlockNotified(id) { return _blocksNotified.includes(id); }
  function markBlockNotified(id) {
    if (!_blocksNotified.includes(id)) {
      _blocksNotified.push(id);
      storage.set(cfgKey('blocksNotified'), _blocksNotified);
    }
  }

  function toggleFavorite(id) {
    if (_favorites.includes(id)) {
      _favorites = _favorites.filter(x => x !== id);
      setFavorites(_favorites);
      return false;
    } else {
      _favorites.unshift(id);
      setFavorites(_favorites);
      return true;
    }
  }

  /* ---------- 书签数据 ---------- */
  function getTagKey() { return cfgKey('tags_' + currentTab); }
  function getTags() { return storage.get(getTagKey(), []); }
  function setTags(arr) { storage.set(getTagKey(), arr); }

  function getTagIdx() {
    const tags = getTags();
    let max = 0;
    const prefix = '书签';
    tags.forEach(t => {
      if (t.name.startsWith(prefix)) {
        const n = parseInt(t.name.slice(prefix.length));
        if (!isNaN(n) && n > max) max = n;
      }
    });
    return max + 1;
  }

  /* ============================================================
     API 通信
     ============================================================ */

  const isFileProtocol = location.protocol === 'file:';
  // 后端为远程地址时允许file://协议跨域请求
  function canRequestAPI() { return !isFileProtocol || /^https?:\/\//i.test(cfg().backend); }

  function apiPost(action, id) {
    if (!canRequestAPI()) return Promise.resolve(null);
    const statsActions = ['view', 'like', 'favorite'];
    const table = statsActions.includes(action) ? 'stats' : 'extra';
    dbg('后端通信', 'POST → ' + cfg().backend + 'data.php', { dbPath: cfg().dbPath || '', db: cfg().dbName, table, action, id });
    return fetch(cfg().backend + 'data.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dbPath: cfg().dbPath || '', db: cfg().dbName, table, action, id })
    }).then(r => r.json()).then(data => { dbg('后端通信', 'POST ✓ 响应', { 请求: { action, id, table }, 响应: data }); return data; }).catch((e) => { dbgW('后端通信', 'POST ✗ 异常', { 请求: { action, id, table }, error: e.message }); return null; });
  }

  function apiGetData() {
    if (!canRequestAPI()) return Promise.resolve(null);
    const c = cfg();
    const body = { dbPath: c.dbPath || '', db: c.dbName, action: 'getData', min: c.mediaIdMin, max: c.mediaIdMax };
    dbg('后端通信', 'POST → ' + c.backend + 'data.php', body);
    return fetch(c.backend + 'data.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(r => r.json())
      .catch(() => null);
  }

  /* ============================================================
     数据缓存
     ============================================================ */

  function getCacheKey(tab) {
    return 'cache_' + cfg().id + '_' + tab;
  }

  function getCacheCycle() {
    return storage.get('cacheCycle', 3600000);
  }

  // 获取上次拉取时间
  function getLastFetchTime() {
    return storage.get(cfgKey('lastFetchTime'), 0);
  }

  // tab名 → 内存变量getter/setter的映射
  const DATA_SLOTS = {
    hot:       { get: () => hotData,       set: v => { hotData = v; } },
    topliked:  { get: () => topLikedData,  set: v => { topLikedData = v; } },
    featured:  { get: () => featuredData,  set: v => { featuredData = v; } },
    downloads: { get: () => downloadsData, set: v => { downloadsData = v; } },
    shares:    { get: () => sharesData,    set: v => { sharesData = v; } },
    blocks:    { get: () => blocksData,    set: v => { blocksData = v; } }
  };

  // 同步：内存 → localStorage
  function syncToStorage(tab) {
    const slot = DATA_SLOTS[tab];
    storage.set(getCacheKey(tab), { data: slot.get(), lastFetchTime: getLastFetchTime() });
  }

  // 页面加载时初始化：无本地数据则写入默认全量数据（count=0），然后统一从储存加载到内存
  function loadLocalToMemory() {
    if (getLastFetchTime() === 0) {
      // 无本地数据：生成默认全量数据写入localStorage，拉取时间设为0（保证绝对过期）
      const defaultData = [];
      for (let i = cfg().mediaIdMin; i <= cfg().mediaIdMax; i++) defaultData.push({ id: i, count: 0 });
      const defaultEntry = { data: defaultData, lastFetchTime: 0 };
      for (const tab of Object.keys(DATA_SLOTS)) {
        storage.set(getCacheKey(tab), defaultEntry);
      }
      storage.set(cfgKey('lastFetchTime'), 0);
      dbg('储存变更', '初始化默认全量数据', { 写入keys: Object.keys(DATA_SLOTS).map(t => getCacheKey(t)), range: cfg().mediaIdMin + '-' + cfg().mediaIdMax, 每项模板: { id: 'N', count: 0 } });
    }
    // 统一从localStorage加载到内存
    for (const [tab, slot] of Object.entries(DATA_SLOTS)) {
      const cached = storage.get(getCacheKey(tab), null);
      slot.set(cached && cached.data ? cached.data : []);
    }
    dbg('储存变更', 'localStorage → 内存变量', { hot: fetchHotData().slice(), topliked: fetchTopLikedData().slice(), featured: fetchFeaturedData().slice(), downloads: fetchDownloadsData().slice(), shares: fetchSharesData().slice(), blocks: fetchBlocksData().slice() });
  }

  // 同步读取：内存为空时生成默认全量数据（count=0），写回内存和localStorage
  function readData(tab) {
    const data = DATA_SLOTS[tab].get();
    if (data.length > 0) return data;
    const ids = [];
    for (let i = cfg().mediaIdMin; i <= cfg().mediaIdMax; i++) ids.push({ id: i, count: 0 });
    DATA_SLOTS[tab].set(ids);
    syncToStorage(tab);
    return ids;
  }

  function fetchHotData()       { return readData('hot'); }
  function fetchTopLikedData()  { return readData('topliked'); }
  function fetchFeaturedData()  { return readData('featured'); }
  function fetchDownloadsData() { return readData('downloads'); }
  function fetchSharesData()    { return readData('shares'); }
  function fetchBlocksData()    { return readData('blocks'); }

  // 统一拉取：一次请求获取 stats + extra 两张表（仅在无本地数据或手动刷新时调用）
  async function fetchAllDataFromServer() {
    try {
      if (!canRequestAPI()) {
        dbgW('后端通信', 'file://协议+本地后端，跳过', { backend: cfg().backend });
        storage.set(cfgKey('lastFetchTime'), Date.now());
        return false;
      }
      dbg('后端通信', 'POST(获取数据) → ' + cfg().backend + 'data.php', { dbPath: cfg().dbPath || '', db: cfg().dbName, min: cfg().mediaIdMin, max: cfg().mediaIdMax });
      const res = await apiGetData();
      if (!res || !res.stats || !Array.isArray(res.stats) || res.stats.length === 0) {
        dbgW('后端通信', 'GET ✗ 响应无效', { response: res });
        storage.set(cfgKey('lastFetchTime'), Date.now());
        return false;
      }

      const now = Date.now();
      const statsData = res.stats;
      const extraData = Array.isArray(res.extra) ? res.extra : [];

      // 快照当前本地数据，用于合并用户增量
      const localSnap = {};
      for (const [tab, slot] of Object.entries(DATA_SLOTS)) {
        const map = {};
        (slot.get() || []).forEach(d => { map[d.id] = d.count; });
        localSnap[tab] = map;
      }

      // 合并函数：将本地增量叠加到服务器数据上
      function mergeWithLocal(serverArr, tab) {
        const local = localSnap[tab];
        const merged = serverArr.map(d => {
          const localCount = local[d.id] || 0;
          return { id: d.id, count: Math.max(d.count, localCount) };
        });
        // 添加仅存在于本地的项（用户新增的记录）
        const serverIds = new Set(serverArr.map(d => d.id));
        for (const [id, count] of Object.entries(local)) {
          if (!serverIds.has(Number(id)) && count > 0) {
            merged.push({ id: Number(id), count });
          }
        }
        return merged;
      }

      // stats 表拆分排序
      DATA_SLOTS.hot.set(quickSort(mergeWithLocal(statsData.map(d => ({ id: d.id, count: d.views || 0 })), 'hot'),
        (a, b) => b.count !== a.count ? b.count - a.count : a.id - b.id));
      DATA_SLOTS.topliked.set(quickSort(mergeWithLocal(statsData.map(d => ({ id: d.id, count: d.likes || 0 })), 'topliked'),
        (a, b) => b.count !== a.count ? b.count - a.count : a.id - b.id));
      DATA_SLOTS.featured.set(quickSort(mergeWithLocal(statsData.map(d => ({ id: d.id, count: d.favorites || 0 })), 'featured'),
        (a, b) => b.count !== a.count ? b.count - a.count : a.id - b.id));

      // extra 表拆分排序
      DATA_SLOTS.downloads.set(quickSort(mergeWithLocal(extraData.map(d => ({ id: d.id, count: d.downloads || 0 })), 'downloads'),
        (a, b) => b.count !== a.count ? b.count - a.count : a.id - b.id));
      DATA_SLOTS.shares.set(quickSort(mergeWithLocal(extraData.map(d => ({ id: d.id, count: d.shares || 0 })), 'shares'),
        (a, b) => b.count !== a.count ? b.count - a.count : a.id - b.id));
      DATA_SLOTS.blocks.set(quickSort(mergeWithLocal(extraData.map(d => ({ id: d.id, count: d.blocks || 0 })), 'blocks'),
        (a, b) => b.count !== a.count ? b.count - a.count : a.id - b.id));

      await new Promise(r => setTimeout(r, 0));
      storage.set(cfgKey('lastFetchTime'), now);
      for (const tab of Object.keys(DATA_SLOTS)) syncToStorage(tab);

      dbg('后端通信', 'GET ✓ 拆分写入6个内存变量', { 请求: { dbPath: cfg().dbPath || '', db: cfg().dbName, min: cfg().mediaIdMin, max: cfg().mediaIdMax }, 响应: { stats: statsData, extra: extraData }, 写入: { hot: fetchHotData().slice(), topliked: fetchTopLikedData().slice(), featured: fetchFeaturedData().slice(), downloads: fetchDownloadsData().slice(), shares: fetchSharesData().slice(), blocks: fetchBlocksData().slice() } });
      return true;
    } catch (e) {
      dbgE('后端通信', 'GET ✗ 异常', { error: e.message, stack: e.stack });
      storage.set(cfgKey('lastFetchTime'), Date.now());
      return false;
    }
  }

  // 页面加载后：仅在无本地数据时自动拉取（有本地数据则跳过，保护用户操作）
  async function checkAndRefreshData() {
    const hasLocal = getLastFetchTime() > 0;
    if (hasLocal) {
      dbg('后端通信', '跳过自动拉取', { lastFetchTime: getLastFetchTime(), 距上次: Math.round((Date.now() - getLastFetchTime()) / 1000) + 's' });
      return;
    }
    dbg('后端通信', '无本地数据，自动拉取', { lastFetchTime: 0 });
    const success = await fetchAllDataFromServer();
    if (success) {
      dbg('后端通信', '自动拉取成功', { tab: currentTab });
      resetAndLoad(false);
    }
  }

  /* ============================================================
     资源编号序列生成（列加载模式）
     ============================================================ */

  let exploreUsed = new Set();

  function generateSortedIds(tab) {
    if (tab === 'home') {
      const ids = [];
      for (let i = cfg().mediaIdMin; i <= cfg().mediaIdMax; i++) {
        if (!isBlocked(i)) ids.push(i);
      }
      return ids;
    }
    if (tab === 'explore') {
      const ids = [];
      let attempts = 0;
      const total = cfg().mediaIdMax - cfg().mediaIdMin + 1;
      while (ids.length < total && attempts < total * 3) {
        attempts++;
        const id = Math.floor(Math.random() * (cfg().mediaIdMax - cfg().mediaIdMin + 1)) + cfg().mediaIdMin;
        if (!exploreUsed.has(id)) {
          exploreUsed.add(id);
          ids.push(id);
        }
      }
      return ids;
    }
    if (tab === 'favorites') {
      return getFavorites().filter(id => !isBlocked(id));
    }
    const slotMap = {
      hot: fetchHotData, topliked: fetchTopLikedData, featured: fetchFeaturedData,
      best: fetchDownloadsData, shared: fetchSharesData, sensitive: fetchBlocksData
    };
    const includeBlocked = tab === 'sensitive';
    if (tab === 'recommend') {
      fetchHotData(); fetchTopLikedData(); fetchFeaturedData();
      fetchDownloadsData(); fetchSharesData(); fetchBlocksData();
      const viewMap = {}, likeMap = {}, favMap = {}, dlMap = {}, shareMap = {}, blockMap = {};
      (hotData || []).forEach(d => viewMap[d.id] = d.count);
      (topLikedData || []).forEach(d => likeMap[d.id] = d.count);
      (featuredData || []).forEach(d => favMap[d.id] = d.count);
      (downloadsData || []).forEach(d => dlMap[d.id] = d.count);
      (sharesData || []).forEach(d => shareMap[d.id] = d.count);
      (blocksData || []).forEach(d => blockMap[d.id] = d.count);
      const allIds = [];
      for (let i = cfg().mediaIdMin; i <= cfg().mediaIdMax; i++) allIds.push(i);
      const scored = allIds.map(id => {
        const v = viewMap[id] || 0, l = likeMap[id] || 0, f = favMap[id] || 0;
        const dl = dlMap[id] || 0, s = shareMap[id] || 0, b = blockMap[id] || 0;
        return { id, score: +((v + l * 2 + f * 3 + dl * 3 + s * 2 - b * 5) / 15).toFixed(2) };
      });
      scored.sort((a, b) => b.score !== a.score ? b.score - a.score : a.id - b.id);
      return includeBlocked ? scored.map(d => d.id) : scored.filter(d => !isBlocked(d.id)).map(d => d.id);
    }
    if (slotMap[tab]) {
      const data = slotMap[tab]().slice().sort((a, b) => b.count !== a.count ? b.count - a.count : a.id - b.id);
      return includeBlocked ? data.map(d => d.id) : data.filter(d => !isBlocked(d.id)).map(d => d.id);
    }
    return [];
  }

  /* ============================================================
     资源卡片创建
     ============================================================ */

  function createMediaCard(id) {
    const card = document.createElement('div');
    card.className = 'media-card';
    card.dataset.id = id;

    const mediaWrap = document.createElement('div');
    mediaWrap.className = 'card-media-wrap';

    let mediaEl;
    if (cfg().mediaType === 'video' || cfg().mediaType === 'audio') {
      mediaEl = document.createElement(cfg().mediaType === 'video' ? 'video' : 'audio');
      mediaEl.className = 'card-media loaded';
      mediaEl.controls = true;
      mediaEl.preload = 'metadata';
      mediaEl.playsInline = true;
      mediaEl.src = mediaPath(id);
      mediaEl.addEventListener('error', () => {
        card.classList.add('card-disabled');
        card.querySelectorAll('.control-bar .ctrl-btn').forEach(btn => {
          btn.classList.add('disabled-btn');
        });
        dbg('卡片缓存', '媒体加载失败，禁用卡片功能', { id });
      });
    } else {
      mediaEl = document.createElement('img');
      mediaEl.className = 'card-media loading';
      mediaEl.alt = '';
      mediaEl.loading = 'lazy';
      mediaEl.dataset.src = mediaPath(id);

      mediaEl.addEventListener('load', () => {
        mediaEl.classList.remove('loading');
        mediaEl.classList.add('loaded');
        mediaWrap.classList.add('media-loaded');
      });

      mediaEl.addEventListener('error', () => {
        mediaEl.classList.remove('loading');
        mediaEl.classList.add('loaded');
        card.classList.add('card-disabled');
        card.querySelectorAll('.control-bar .ctrl-btn').forEach(btn => {
          btn.classList.add('disabled-btn');
        });
        dbg('卡片缓存', '媒体加载失败，禁用卡片功能', { id });
      });

      // 使用 IntersectionObserver 懒加载
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !scrollPauseLoad) {
            mediaEl.src = mediaEl.dataset.src;
            observer.unobserve(mediaEl);
            observer.disconnect();
          }
        });
      }, { rootMargin: '200px' });
      observer.observe(mediaEl);
    }

    mediaWrap.appendChild(mediaEl);

    // 控件栏
    const controlBar = document.createElement('div');
    controlBar.className = 'control-bar';

    // 从缓存获取计数
    const viewCount = getCountFromCache('hot', id);
    const likeCount = getCountFromCache('topliked', id);
    const favCount = getCountFromCache('featured', id);
    const dlCount = getCountFromCache('downloads', id);
    const shareCount = getCountFromCache('shares', id);
    const blockCount = getCountFromCache('blocks', id);

    // 浏览量（不可交互，仅显示）
    const btnView = createCtrlBtn('&#128065;', '浏览量', null, viewCount);
    btnView.classList.add('ctrl-btn-static');

    // 点赞
    const btnLike = createCtrlBtn('&#9829;', '点赞', () => {
      handleLike(id, btnLike);
    }, likeCount);
    btnLike.dataset.action = 'like';
    if (isLiked(id)) btnLike.classList.add('active-like');

    // 收藏
    const btnFav = createCtrlBtn('&#9733;', '收藏', () => {
      handleFavorite(id, btnFav);
    }, favCount);
    btnFav.dataset.action = 'favorite';
    if (isFavorited(id)) btnFav.classList.add('active-fav');

    // 全屏
    const btnFullscreen = createCtrlBtn('&#9974;', '全屏', () => openFullscreen(id));

    // 下载
    const btnDownload = createCtrlBtn('&#8615;', '下载', () => handleDownload(id), dlCount);
    btnDownload.dataset.action = 'download';

    // 分享
    const btnShare = createCtrlBtn('&#128279;', '分享', () => handleShare(id), shareCount);
    btnShare.dataset.action = 'share';

    // 屏蔽/取消屏蔽（均需二次确认）
    function resetBlockBtn() {
      clearTimeout(btnBlock._confirmTimer);
      btnBlock._confirmTimer = null;
      btnBlock.classList.remove('confirm-state');
      if (currentTab === 'sensitive' && isBlocked(id)) {
        btnBlock.title = '取消屏蔽';
        btnBlock.querySelector('.ctrl-icon').innerHTML = '&#8617;';
      } else {
        btnBlock.title = '屏蔽';
        btnBlock.querySelector('.ctrl-icon').innerHTML = '&#128683;';
      }
    }
    const btnBlock = createCtrlBtn('&#128683;', '屏蔽', () => {
      if (btnBlock.classList.contains('confirm-state')) {
        resetBlockBtn();
        if (currentTab === 'sensitive' && isBlocked(id)) {
          unblockMedia(id);
          card.classList.remove('card-blocked');
          showToast('已取消屏蔽');
        } else {
          handleBlock(id, card, btnBlock);
        }
      } else {
        btnBlock.classList.add('confirm-state');
        btnBlock.title = currentTab === 'sensitive' && isBlocked(id) ? '确认取消屏蔽？' : '确认屏蔽？';
        btnBlock._confirmTimer = setTimeout(resetBlockBtn, 3000);
      }
    }, blockCount);
    btnBlock._resetConfirm = resetBlockBtn;
    btnBlock.dataset.action = 'block';

    // 敏感页已屏蔽卡片：标红边框 + 撤销图标 + 按钮文案改为"取消屏蔽"
    if (currentTab === 'sensitive' && isBlocked(id)) {
      card.classList.add('card-blocked');
      btnBlock.title = '取消屏蔽';
      btnBlock.querySelector('.ctrl-icon').innerHTML = '&#8617;';
    }

    controlBar.append(btnView, btnLike, btnFav, btnFullscreen, btnDownload, btnShare, btnBlock);

    card.append(mediaWrap, controlBar);

    // 双击视窗区域打开全屏
    mediaWrap.addEventListener('dblclick', (e) => {
      e.preventDefault();
      openFullscreen(id);
    });

    cardDomCache[id] = card;
    return card;
  }

  function createCtrlBtn(iconHtml, tooltip, onClick, count) {
    const btn = document.createElement('button');
    btn.className = 'ctrl-btn';
    btn.title = tooltip;
    let html = `<span class="ctrl-icon">${iconHtml}</span>`;
    if (count !== undefined) {
      html += `<span class="ctrl-count">${formatCount(count)}</span>`;
    }
    btn.innerHTML = html;
    if (count !== undefined) {
      btn._countEl = btn.querySelector('.ctrl-count');
    }
    if (onClick) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        onClick();
      });
    }
    return btn;
  }

  // 从全局缓存获取卡片，不存在则构建并缓存
  function getOrCreateCard(id) {
    let card = cardDomCache[id];
    if (card) {
      // 复用缓存卡片时，同步点赞/收藏/屏蔽的视觉状态
      const btnLike = card.querySelector('[data-action="like"]');
      const btnFav = card.querySelector('[data-action="favorite"]');
      const btnBlock = card.querySelector('[data-action="block"]');
      if (btnLike) {
        btnLike.classList.toggle('active-like', isLiked(id));
        btnLike.title = isLiked(id) ? '已赞' : '点赞';
      }
      if (btnFav) {
        btnFav.classList.toggle('active-fav', isFavorited(id));
        btnFav.title = isFavorited(id) ? '收藏' : '取消收藏';
      }
      if (btnBlock) {
        if (currentTab === 'sensitive' && isBlocked(id)) {
          card.classList.add('card-blocked');
          btnBlock.title = '取消屏蔽';
          btnBlock.querySelector('.ctrl-icon').innerHTML = '&#8617;';
        } else {
          card.classList.remove('card-blocked');
          btnBlock.title = '屏蔽';
          btnBlock.querySelector('.ctrl-icon').innerHTML = '&#128683;';
        }
      }
      // 同步各量计数显示
      syncCardCounts(id, card);
      return card;
    }
    return createMediaCard(id);
  }

  // 同步缓存卡片的各量计数显示（从DATA_SLOTS读取最新值）
  function syncCardCounts(id, card) {
    const actions = {
      view: 'hot', like: 'topliked', favorite: 'featured',
      download: 'downloads', share: 'shares'
    };
    for (const [action, slot] of Object.entries(actions)) {
      const item = DATA_SLOTS[slot].get().find(d => d.id === id);
      const count = item ? item.count : 0;
      const selector = action === 'view' ? '.ctrl-btn-static' : `[data-action="${action}"]`;
      const btn = card.querySelector(selector);
      if (btn && btn._countEl) btn._countEl.textContent = formatCount(count);
    }
  }

  // 更新卡片DOM中的计数显示（通过cardDomCache查找）
  function updateCardCountDisplay(id, action, count) {
    const card = cardDomCache[id];
    if (!card) return;
    const selector = action === 'view' ? '.ctrl-btn-static' : `[data-action="${action}"]`;
    const btn = card.querySelector(selector);
    if (btn && btn._countEl) btn._countEl.textContent = formatCount(count);
  }

  /* ---------- 控件栏操作 ---------- */

  function handleLike(id, btn) {
    const nowLiked = toggleLike(id);
    if (nowLiked) {
      dbg('用户操作', '点赞 id=' + id, { id, B列表已通知: isLikeNotified(id), 通知后端: !isLikeNotified(id) });
      btn.classList.add('active-like');
      btn.title = '已赞';
      if (!isLikeNotified(id)) {
        markLikeNotified(id);
        apiPost('like', id);
      }
    } else {
      dbg('用户操作', '取消点赞 id=' + id, { id, 仅前端: true });
      btn.classList.remove('active-like');
      btn.title = '点赞';
    }
    const newCount = incrementCacheCount('topliked', id, nowLiked ? 1 : -1);
    updateCardCountDisplay(id, 'like', newCount);
  }

  function handleFavorite(id, btn) {
    const nowFav = toggleFavorite(id);
    if (nowFav) {
      dbg('用户操作', '收藏 id=' + id, { id, B列表已通知: isFavNotified(id), 通知后端: !isFavNotified(id) });
      btn.classList.add('active-fav');
      btn.title = '收藏';
      showToast('已收藏');
      if (!isFavNotified(id)) {
        markFavNotified(id);
        apiPost('favorite', id);
      }
    } else {
      dbg('用户操作', '取消收藏 id=' + id, { id, tab: currentTab, 仅前端: true });
      btn.classList.remove('active-fav');
      btn.title = '取消收藏';
      showToast('已取消收藏');
      // 收藏tab：立即移除卡片（缓存保留）
      if (currentTab === 'favorites') {
        const card = cardDomCache[id];
        if (card) {
          card.style.transition = 'opacity 0.3s, transform 0.3s';
          card.style.opacity = '0';
          card.style.transform = 'scale(0.9)';
          setTimeout(() => { card.style.display = 'none'; card.style.opacity = ''; card.style.transform = ''; }, 300);
        }
        const order = tabCardOrder[currentTab];
        if (order) {
          const idx = order.indexOf(id);
          if (idx !== -1) order.splice(idx, 1);
        }
      }
    }
    const newCount = incrementCacheCount('featured', id, nowFav ? 1 : -1);
    updateCardCountDisplay(id, 'favorite', newCount);
  }

  function handleShare(id) {
    dbg('用户操作', '分享 id=' + id, { id, B列表已通知: isShareNotified(id), 通知后端: !isShareNotified(id) });
    const url = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '') + '/' + mediaPath(id);
    navigator.clipboard.writeText(url).then(() => {
      showToast('链接已复制到剪贴板');
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('链接已复制到剪贴板');
    });
    if (!isShareNotified(id)) {
      markShareNotified(id);
      apiPost('share', id);
      const newCount = incrementCacheCount('shares', id);
      updateCardCountDisplay(id, 'share', newCount);
    }
  }

  async function handleDownload(id) {
    dbg('用户操作', '下载 id=' + id, { id, B列表已通知: isDownloadNotified(id), 通知后端: !isDownloadNotified(id) });
    const url = mediaPath(id);
    const name = cfg().mediaPrefix + padId(id) + cfg().mediaExt;

    function fallbackDownload() {
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch {
      fallbackDownload();
    }

    if (!isDownloadNotified(id)) {
      markDownloadNotified(id);
      apiPost('download', id);
      const newCount = incrementCacheCount('downloads', id);
      updateCardCountDisplay(id, 'download', newCount);
    }
  }

  function getCountFromCache(tab, id) {
    const fetchMap = {
      hot: fetchHotData, topliked: fetchTopLikedData, featured: fetchFeaturedData,
      downloads: fetchDownloadsData, shares: fetchSharesData, blocks: fetchBlocksData
    };
    const fn = fetchMap[tab];
    const data = fn ? fn() : [];
    const item = data.find(d => d.id === id);
    return item ? item.count : 0;
  }

  function incrementCacheCount(tab, id, delta) {
    if (delta === undefined) delta = 1;
    const data = DATA_SLOTS[tab].get();
    const item = data.find(d => d.id === id);
    const oldCount = item ? item.count : 0;
    if (item) {
      item.count = Math.max(0, item.count + delta);
    } else {
      data.push({ id, count: Math.max(0, delta) });
    }
    const newCount = item ? item.count : Math.max(0, delta);
    const changeIdx = data.findIndex(d => d.id === id);
    dbg('储存变更', tab + '[' + id + '] ' + oldCount + ' → ' + newCount, { 变更位置: changeIdx, delta, 完整数据集: data.slice() });
    syncToStorage(tab);
    return item ? item.count : Math.max(0, delta);
  }

  function handleBlock(id, card, btnBlock) {
    dbg('用户操作', '屏蔽 id=' + id, { id, tab: currentTab, B列表已通知: isBlockNotified(id), 通知后端: !isBlockNotified(id) });
    blockMedia(id);
    let newCount = 0;
    if (!isBlockNotified(id)) {
      markBlockNotified(id);
      apiPost('block', id);
      newCount = incrementCacheCount('blocks', id);
    } else {
      const item = DATA_SLOTS.blocks.get().find(d => d.id === id);
      newCount = item ? item.count : 0;
    }
    updateCardCountDisplay(id, 'block', newCount);
    // 撤销前端点赞和收藏（不影响后端）
    if (isLiked(id)) {
      _likes = _likes.filter(x => x !== id);
      setLikes(_likes);
      incrementCacheCount('topliked', id, -1);
      updateCardCountDisplay(id, 'like', getCountFromCache('topliked', id));
      const btnLike = card.querySelector('[data-action="like"]');
      if (btnLike) { btnLike.classList.remove('active-like'); btnLike.title = '点赞'; }
    }
    if (isFavorited(id)) {
      _favorites = _favorites.filter(x => x !== id);
      setFavorites(_favorites);
      incrementCacheCount('featured', id, -1);
      updateCardCountDisplay(id, 'favorite', getCountFromCache('featured', id));
      const btnFav = card.querySelector('[data-action="favorite"]');
      if (btnFav) { btnFav.classList.remove('active-fav'); btnFav.title = '收藏'; }
    }
    if (currentTab === 'sensitive') {
      // 敏感tab：标红边框+变暗，按钮变为取消屏蔽
      card.classList.add('card-blocked');
      if (btnBlock) {
        btnBlock.title = '取消屏蔽';
        btnBlock.querySelector('.ctrl-icon').innerHTML = '&#8617;';
      }
    } else {
      // 非敏感tab：动画移除卡片（缓存保留）
      card.style.transition = 'opacity 0.3s, transform 0.3s';
      card.style.opacity = '0';
      card.style.transform = 'scale(0.9)';
      setTimeout(() => { card.style.display = 'none'; card.style.opacity = ''; card.style.transform = ''; }, 300);
      const order = tabCardOrder[currentTab];
      if (order) {
        const idx = order.indexOf(id);
        if (idx !== -1) order.splice(idx, 1);
      }
    }
    showToast('已屏蔽该资源');
  }

  /* ============================================================
     全屏查看
     ============================================================ */

  const VIEW_COOLDOWN = 10000; // 浏览冷冻期（毫秒）
  function getViewCooldowns() { return storage.get(cfgKey('viewCooldowns'), {}); }
  function setViewCooldown(id) {
    const cd = getViewCooldowns();
    const now = Date.now();
    // 清理过期条目，防止对象无限增长
    for (const k in cd) {
      if (now - cd[k] >= VIEW_COOLDOWN) delete cd[k];
    }
    cd[id] = now;
    storage.set(cfgKey('viewCooldowns'), cd);
  }
  function isViewCooldown(id) {
    const cd = getViewCooldowns();
    return cd[id] && Date.now() - cd[id] < VIEW_COOLDOWN;
  }

  function openFullscreen(id) {
    dbg('用户操作', '全屏查看 id=' + id, { id, 冷冻期: isViewCooldown(id), 冷冻时长: VIEW_COOLDOWN / 1000 + 's', 计数: !isViewCooldown(id) });
    if (!isViewCooldown(id)) {
      setViewCooldown(id);
      apiPost('view', id);
      const newCount = incrementCacheCount('hot', id);
      updateCardCountDisplay(id, 'view', newCount);
    }
    fsScale = 1;
    fsTranslateX = 0;
    fsTranslateY = 0;
    dom.fullscreenMedia.src = mediaPath(id);
    dom.fullscreenMedia.style.transform = '';
    dom.fullscreenModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeFullscreen() {
    dbg('用户操作', '关闭全屏', { src: dom.fullscreenMedia.src });
    dom.fullscreenModal.classList.remove('open');
    document.body.style.overflow = '';
    dom.fullscreenMedia.src = '';
    fsDragging = false;
    fsScale = 1;
    fsTranslateX = 0;
    fsTranslateY = 0;
  }

  function applyFsTransform() {
    dom.fullscreenMedia.style.transform = `translate(${fsTranslateX}px, ${fsTranslateY}px) scale(${fsScale})`;
  }

  function zoomIn() {
    fsScale = Math.min(fsScale * 1.3, 10);
    applyFsTransform();
  }

  function zoomOut() {
    fsScale = Math.max(fsScale / 1.3, 0.2);
    applyFsTransform();
  }

  function zoomReset() {
    fsScale = 1;
    fsTranslateX = 0;
    fsTranslateY = 0;
    applyFsTransform();
  }

  /* ============================================================
     加载资源页
     ============================================================ */

  // 按页加载卡片（一页 = CARDS_PER_PAGE 张）
  let isLoadingPage = false;
  function loadNextPage() {
    if (isLoadingPage) return;
    isLoadingPage = true;
    const sortedIds = window._sortedIds;
    if (!sortedIds) { isLoadingPage = false; return; }
    const start = currentPage * CARDS_PER_PAGE;
    if (start >= sortedIds.length) {
      dom.noMore.style.display = 'block';
      isLoadingPage = false;
      return;
    }

    const pageIds = sortedIds.slice(start, start + CARDS_PER_PAGE);
    const columns = dom.gridContainer.querySelectorAll('.original-column');

    pageIds.forEach((id, i) => {
      const card = getOrCreateCard(id);
      if (!tabCardOrder[currentTab]) tabCardOrder[currentTab] = [];
      tabCardOrder[currentTab].push(id);
      if (columns[i % colCount]) columns[i % colCount].appendChild(card);
    });

    currentPage++;
    dom.loadIndicator.style.display = 'none';
    dom.noMore.style.display = pageIds.length < CARDS_PER_PAGE ? 'block' : 'none';
    isLoadingPage = false;
    dbg('页面加载', 'loadNextPage', { page: currentPage, 本页数: pageIds.length, tab: currentTab, ratio: mediaRatio });
  }

  /* ---------- 重建列容器（不重载内容） ---------- */
  function rebuildOriginalColumns() {
    dbg('布局变化', 'rebuildOriginalColumns', { colCount, ratio: mediaRatio, tab: currentTab });
    dom.gridContainer.innerHTML = '';

    // 创建列容器并分配卡片
    for (let i = 0; i < colCount; i++) {
      const col = document.createElement('div');
      col.className = 'original-column';
      dom.gridContainer.appendChild(col);
    }
    const columns = dom.gridContainer.querySelectorAll('.original-column');
    const order = tabCardOrder[currentTab] || [];
    order.forEach((id, idx) => {
      const card = cardDomCache[id];
      if (card) columns[idx % colCount].appendChild(card);
    });

    observeColumnSentinels();
    dbg('布局变化', '分配卡片到列', { 卡片数: order.length, 列数: colCount });
  }

  /* ---------- 重置并加载 ---------- */
  function resetAndLoad(resetExplore = true) {
    dbg('页面加载', 'resetAndLoad', { tab: currentTab, 旧缓存数: (tabCardOrder[currentTab] || []).length });
    scrollPauseLoad = false;
    currentPage = 0;
    dom.gridContainer.innerHTML = '';
    dom.loadIndicator.style.display = 'none';
    dom.noMore.style.display = 'none';

    delete tabCardOrder[currentTab];

    if (currentTab === 'explore' && resetExplore) {
      exploreUsed = new Set();
    }

    // 生成当前tab的完整排序ID列表
    window._sortedIds = generateSortedIds(currentTab);

    // 创建列容器
    for (let i = 0; i < colCount; i++) {
      const col = document.createElement('div');
      col.className = 'original-column';
      dom.gridContainer.appendChild(col);
    }

    loadNextPage();
    observeColumnSentinels();
  }

  /* ============================================================
     无限滚动（sentinel 触发）
     ============================================================ */

  let scrollSentinel = null;
  let scrollObserver = null;

  function setupInfiniteScroll() {
    scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !scrollPauseLoad) {
          loadNextPage();
          // 加载后移动sentinel到列尾，确保下次触发
          placeSentinel();
        }
      });
    }, { rootMargin: '200px' });
  }

  // 放置/移动sentinel到最后一个列的末尾
  function placeSentinel() {
    if (scrollSentinel && scrollSentinel.parentNode) {
      scrollObserver.unobserve(scrollSentinel);
      scrollSentinel.remove();
    }
    scrollSentinel = document.createElement('div');
    scrollSentinel.style.height = '1px';
    const columns = dom.gridContainer.querySelectorAll('.original-column');
    if (columns.length > 0) {
      columns[columns.length - 1].appendChild(scrollSentinel);
      scrollObserver.observe(scrollSentinel);
    }
  }

  function observeColumnSentinels() {
    placeSentinel();
  }

  /* ============================================================
     Tab 切换
     ============================================================ */

  function setupAnnouncement() {
    dom.announcementBar.textContent = cfg().announcement || ANNOUNCEMENT;
  }

  function updatePageTitle() {
    document.title = cfg().nickname || PAGE_TITLE;
  }

  function updatePageIcon() {
    const src = cfg().iconSrc;
    if (!src) return;
    let link = document.querySelector('link[rel="icon"]') || document.querySelector('link[rel="shortcut icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = src;
  }

  function updateInfoBars() {
    dom.descriptionBar.textContent = TAB_DESCRIPTIONS[currentTab] || '';
  }

  function setSidebarEnabled(enabled) {
    if (!enabled) {
      dom.sidebar.classList.add('collapsed');
      dom.sidebarExpand.style.display = 'none';
    } else {
      updateSidebarState();
    }
    dom.btnPrevTag.style.pointerEvents = enabled ? '' : 'none';
    dom.btnAddTag.style.pointerEvents = enabled ? '' : 'none';
    dom.btnNextTag.style.pointerEvents = enabled ? '' : 'none';
    dom.btnClearTags.style.pointerEvents = enabled ? '' : 'none';
    dom.btnPrevTag.style.opacity = enabled ? '' : '0.3';
    dom.btnAddTag.style.opacity = enabled ? '' : '0.3';
    dom.btnNextTag.style.opacity = enabled ? '' : '0.3';
    dom.btnClearTags.style.opacity = enabled ? '' : '0.3';
  }

  function switchTab(tab) {
    if (tab === currentTab && tabBarBtn && tabBarBtn.getCurrent() === tab) {
      window.scrollTo(0, 0);
      return;
    }
    if (tabBarBtn) tabBarBtn.switchTo(tab);
  }

  function _handleTabSwitch(tab, isDblClick) {
    dbg(initializing ? '系统初化' : '用户操作', 'switchTab ' + currentTab + ' → ' + tab, { from: currentTab, to: tab, 缓存数: (tabCardOrder[tab] || []).length, cardDomCache总数: Object.keys(cardDomCache).length });
    currentTab = tab;
    storage.set('currentTab', tab);

    if (isDblClick) {
      window.scrollTo(0, 0);
      if (tab === 'explore') {
        dbg('用户操作', '双击探索tab重新加载', {});
        resetAndLoad(true);
      } else {
        dbg('用户操作', '双击tab重新排序', { tab, 缓存数: (tabCardOrder[tab] || []).length });
        restoreTabCards(tab);
      }
      return;
    }

    setSidebarEnabled(tab !== 'explore');
    scrollPauseLoad = true;
    window.scrollTo(0, 0);
    updateInfoBars();
    if (!restoreTabCards(tab)) resetAndLoad();
    renderTags();
  }

  // 从全局缓存恢复卡片，返回是否成功
  function restoreTabCards(tab) {
    const order = tabCardOrder[tab];
    if (!order || order.length === 0) return false;

    // 按当前tab的排序规则重新排序缓存ID
    const slotMap = { hot: 'hot', topliked: 'topliked', featured: 'featured', best: 'downloads', shared: 'shares', sensitive: 'blocks' };
    let sortedIds;
    if (tab === 'home') {
      sortedIds = order.slice().sort((a, b) => a - b);
    } else if (tab === 'explore') {
      sortedIds = order; // 保持随机顺序
    } else if (tab === 'favorites') {
      // 按当前收藏列表顺序重排（取消收藏的项自然脱落）
      sortedIds = getFavorites().filter(id => order.includes(id));
    } else if (tab === 'recommend') {
      const viewMap = {}, likeMap = {}, favMap = {}, dlMap = {}, shareMap = {}, blockMap = {};
      (hotData || []).forEach(d => viewMap[d.id] = d.count);
      (topLikedData || []).forEach(d => likeMap[d.id] = d.count);
      (featuredData || []).forEach(d => favMap[d.id] = d.count);
      (downloadsData || []).forEach(d => dlMap[d.id] = d.count);
      (sharesData || []).forEach(d => shareMap[d.id] = d.count);
      (blocksData || []).forEach(d => blockMap[d.id] = d.count);
      sortedIds = order.slice().sort((a, b) => {
        const sa = ((viewMap[a] || 0) + (likeMap[a] || 0) * 2 + (favMap[a] || 0) * 3 + (dlMap[a] || 0) * 3 + (shareMap[a] || 0) * 2 - (blockMap[a] || 0) * 5) / 15;
        const sb = ((viewMap[b] || 0) + (likeMap[b] || 0) * 2 + (favMap[b] || 0) * 3 + (dlMap[b] || 0) * 3 + (shareMap[b] || 0) * 2 - (blockMap[b] || 0) * 5) / 15;
        return sb !== sa ? sb - sa : a - b;
      });
    } else if (slotMap[tab]) {
      const countMap = {};
      DATA_SLOTS[slotMap[tab]].get().forEach(d => { countMap[d.id] = d.count; });
      sortedIds = order.slice().sort((a, b) => {
        const ca = countMap[a] || 0, cb = countMap[b] || 0;
        return cb !== ca ? cb - ca : a - b;
      });
    } else {
      sortedIds = order;
    }

    // 更新加载顺序为排序后的顺序（确保列重建时保持排序）
    tabCardOrder[tab] = sortedIds;

    // 非敏感tab过滤掉已屏蔽项，敏感tab显示全部
    const renderIds = tab === 'sensitive' ? sortedIds : sortedIds.filter(id => !isBlocked(id));

    dbg('卡片缓存', 'restoreTabCards', { tab, 排序数: sortedIds.length, 渲染数: renderIds.length, 排序后前5: renderIds.slice(0, 5), 缓存总数: Object.keys(cardDomCache).length });
    dom.gridContainer.innerHTML = '';

    // 创建列容器
    for (let i = 0; i < colCount; i++) {
      const col = document.createElement('div');
      col.className = 'original-column';
      dom.gridContainer.appendChild(col);
    }
    const columns = dom.gridContainer.querySelectorAll('.original-column');

    renderIds.forEach((id, idx) => {
      const card = getOrCreateCard(id);
      columns[idx % colCount].appendChild(card);
    });

    // 设置继续加载状态
    window._sortedIds = generateSortedIds(tab);
    const curOrder = tabCardOrder[tab] || [];
    currentPage = Math.ceil(curOrder.length / CARDS_PER_PAGE);

    dom.loadIndicator.style.display = 'none';
    dom.noMore.style.display = 'none';
    observeColumnSentinels();
    return true;
  }

  /* ============================================================
     Tab溢出折叠
     ============================================================ */

  /* ---------- 导航栏冻结+收起组件 ---------- */
  const NavScroll = (() => {
    let nav = null;
    let lastScrollY = 0;
    let hideAccum = 0;       // 向下滚动累计距离
    let ticking = false;
    let hidden = false;

    const HIDE_THRESHOLD = 80;   // 向下滚动多少 px 后收起
    const REVEAL_THRESHOLD = 5;  // 向上滚动多少 px 后展开
    const TOP_SAFE = 10;         // 距顶部多少 px 内强制展开

    function init(navEl) {
      nav = navEl;
      lastScrollY = window.scrollY;
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    function update() {
      ticking = false;
      const curY = window.scrollY;
      const delta = curY - lastScrollY;
      lastScrollY = curY;

      // 距顶部很近时强制展开
      if (curY <= TOP_SAFE) {
        show();
        hideAccum = 0;
        return;
      }

      if (delta > 0) {
        // 向下滚动：累计距离，超过阈值后收起
        hideAccum += delta;
        if (hideAccum > HIDE_THRESHOLD && !hidden) {
          hide();
        }
      } else if (delta < 0) {
        // 向上滚动：重置累计，超过揭示阈值后展开
        hideAccum = 0;
        if (delta < -REVEAL_THRESHOLD && hidden) {
          show();
        }
      }
    }

    function hide() {
      hidden = true;
      nav.classList.add('nav-hidden');
    }

    function show() {
      hidden = false;
      nav.classList.remove('nav-hidden');
    }

    function isHidden() { return hidden; }

    return { init, hide, show, isHidden };
  })();

  /* ============================================================
     Dropdown 类 — 统一自定义下拉控件
     ============================================================ */
  class Dropdown {
    // 类级默认值（所有实例共享）
    static DEFAULTS = {
      LONG_PRESS: 400,
      AUTO_CLOSE: 3000,
      wrapperCls: 'custom-select',
      triggerCls: 'custom-select-value',
      dropdownCls: 'custom-select-dropdown',
      optionCls: 'custom-select-option',
    };

    /**
     * @param {Object} opts
     * @param {'click'|'longpress'|'contextmenu'} opts.mode - 触发模式
     * @param {HTMLElement} opts.parent - 初始挂载父节点
     * @param {Array<{text:string,value:string|number}>} opts.items - 选项
     * @param {Function} [opts.onChange] - 选中回调 (value, index)
     * @param {Function} [opts.onOpen] - 打开前回调
     * @param {number} [opts.longPress] - 长按触发时间(ms)
     * @param {number} [opts.autoClose] - 长按后自动关闭时间(ms)
     * @param {string} [opts.wrapperCls] - 自定义外层 class
     * @param {string} [opts.triggerCls] - 自定义触发区 class
     * @param {string} [opts.dropdownCls] - 自定义下拉面板 class
     * @param {string} [opts.optionCls] - 自定义选项 class
     */
    constructor(opts) {
      // 合并配置
      this.cfg = Object.assign({}, Dropdown.DEFAULTS, opts);
      this.mode = this.cfg.mode || 'click';
      this.onChange = this.cfg.onChange || (() => {});
      this.onOpen = this.cfg.onOpen || null;

      // 实例状态
      this.current = 0;
      this._isOpen = false;
      this._pressTimer = null;
      this._longPressFired = false;
      this._autoCloseTimer = null;

      // 构建 DOM
      this._buildDOM();

      // 绑定事件（根据模式）
      this._bindEvents();

      // 填充选项
      if (this.cfg.items && this.cfg.items.length > 0) {
        this.setItems(this.cfg.items);
      }

      // 挂载到父节点
      if (this.cfg.parent) {
        this.cfg.parent.appendChild(this.wrap);
      }
    }

    // ---- DOM 构建 ----
    _buildDOM() {
      const c = this.cfg;
      this.wrap = document.createElement('div');
      this.wrap.className = c.wrapperCls;
      this.trigger = document.createElement('div');
      this.trigger.className = c.triggerCls;
      this.dropdown = document.createElement('div');
      this.dropdown.className = c.dropdownCls;
      this.dropdown.style.position = 'fixed';
      this.wrap.appendChild(this.trigger);
    }

    // ---- 事件绑定 ----
    _bindEvents() {
      // 按压视觉反馈（所有模式通用）
      this.trigger.addEventListener('mousedown', () => this.trigger.classList.add('pressed'));
      this.trigger.addEventListener('mouseup', () => this.trigger.classList.remove('pressed'));
      this.trigger.addEventListener('mouseleave', () => this.trigger.classList.remove('pressed'));

      // 点击外部关闭（通用）
      this._onOutside = (e) => {
        if (this._isOpen && !this.wrap.contains(e.target) && !this.dropdown.contains(e.target)) {
          this.close();
        }
      };
      document.addEventListener('mousedown', this._onOutside);

      if (this.mode === 'click') {
        this.trigger.addEventListener('click', (e) => {
          e.stopPropagation();
          this._isOpen ? this.close() : (this.onOpen && this.onOpen(), this.open());
        });
      } else if (this.mode === 'longpress') {
        this.trigger.addEventListener('click', () => {
          if (this._longPressFired) { this._longPressFired = false; return; }
        });
        this.trigger.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          this.open();
        });
        this._bindLongPress();
      } else if (this.mode === 'contextmenu') {
        this.trigger.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          this._isOpen ? this.close() : this.open();
        });
      }
    }

    // ---- 长按事件绑定（longpress / both 模式共用） ----
    _bindLongPress() {
      this.trigger.addEventListener('touchstart', () => this._startPress(), { passive: true });
      this.trigger.addEventListener('touchend', () => this._cancelPress());
      this.trigger.addEventListener('touchmove', () => this._cancelPress(), { passive: true });
      this.trigger.addEventListener('mousedown', (e) => { if (e.button === 0) this._startPress(); });
      this.trigger.addEventListener('mouseup', () => this._cancelPress());
      this.trigger.addEventListener('mouseleave', () => this._cancelPress());
    }

    // ---- 长按逻辑（实例级定时器） ----
    _startPress() {
      this._longPressFired = false;
      this._pressTimer = setTimeout(() => {
        this._longPressFired = true;
        this.open();
        this._autoCloseTimer = setTimeout(() => {
          this.close();
          this._longPressFired = false;
        }, this.cfg.autoClose);
      }, this.cfg.longPress);
    }

    _cancelPress() {
      clearTimeout(this._pressTimer);
    }

    // ---- 下拉定位 ----
    _positionDropdown() {
      const r = this.trigger.getBoundingClientRect();
      this.dropdown.style.top = (r.bottom + 4) + 'px';
      this.dropdown.style.left = r.left + 'px';
      this.dropdown.style.minWidth = r.width + 'px';
    }

    // ---- 选项构建 ----
    _buildOptions() {
      this.dropdown.innerHTML = '';
      (this._items || []).forEach((item, i) => {
        const el = document.createElement('div');
        el.className = this.cfg.optionCls + (i === this.current ? ' selected' : '');
        el.textContent = item.text;
        el.dataset.index = i;
        el.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (i === this.current) { this.close(); return; }
          this.current = i;
          this.trigger.textContent = item.text;
          this.dropdown.querySelectorAll('.' + this.cfg.optionCls).forEach((o, j) => {
            o.classList.toggle('selected', j === i);
          });
          this.close();
          this.onChange(item.value, i);
        });
        this.dropdown.appendChild(el);
      });
    }

    // ---- 下拉滚轮 ----
    _onDropdownWheel(e) {
      e.preventDefault();
      e.currentTarget.scrollTop += e.deltaY;
    }

    // ---- 公开 API ----

    open() {
      this._positionDropdown();
      document.body.appendChild(this.dropdown);
      this.wrap.classList.add('open');
      this._isOpen = true;
      const sel = this.dropdown.querySelector('.' + this.cfg.optionCls + '.selected');
      if (sel) sel.scrollIntoView({ block: 'nearest' });
      this.dropdown.addEventListener('wheel', this._onDropdownWheel, { passive: false });
    }

    close() {
      if (!this._isOpen) return;
      this.wrap.classList.remove('open');
      this.dropdown.removeEventListener('wheel', this._onDropdownWheel);
      if (this.dropdown.parentNode) this.dropdown.parentNode.removeChild(this.dropdown);
      this._isOpen = false;
    }

    isOpen() { return this._isOpen; }

    setValue(val) {
      const idx = (this._items || []).findIndex(it => it.value === val);
      if (idx < 0) return;
      this.current = idx;
      this.trigger.textContent = this._items[idx].text;
      this.dropdown.querySelectorAll('.' + this.cfg.optionCls).forEach((o, j) => {
        o.classList.toggle('selected', j === idx);
      });
    }

    getValue() { return this._items[this.current]?.value; }
    getIndex() { return this.current; }

    setItems(items) {
      this._items = items;
      this._buildOptions();
      this.trigger.textContent = items[this.current]?.text || '';
    }

    rebuild() {
      this._buildOptions();
      this.trigger.textContent = this._items[this.current]?.text || '';
    }

    getWrap() { return this.wrap; }
    getTrigger() { return this.trigger; }
    getDropdown() { return this.dropdown; }

    destroy() {
      this.close();
      document.removeEventListener('mousedown', this._onOutside);
      if (this.wrap.parentNode) this.wrap.parentNode.removeChild(this.wrap);
    }
  }

  /* ---------- 导航栏 TabBar 组件 ---------- */

  class TabBarBtn {
    static DEFAULTS = { DBL_CLICK: 300, OVERFLOW_THRESHOLD: 80 };

    constructor(navEl, opts = {}) {
      this.cfg = Object.assign({}, TabBarBtn.DEFAULTS, opts);
      this._nav = navEl;
      this._tabGroup = navEl.querySelector('.tab-group');
      this._onSwitch = this.cfg.onSwitch || (() => {});
      this._currentTab = null;
      this._lastClick = {};

      const btns = this._tabGroup.querySelectorAll('.tab-btn[data-tab]');
      dbg('系统初化', 'TabBarBtn构造', { 按钮数: btns.length, tabGroup: this._tabGroup.className });
      btns.forEach(btn => this._bindBtn(btn));
      this._initOverflow();
      requestAnimationFrame(() => this.recalcOverflow());
    }

    // ---- 按钮事件绑定 ----
    _bindBtn(btn) {
      btn.addEventListener('mousedown', () => btn.classList.add('tab-pressed'));
      btn.addEventListener('mouseup', () => btn.classList.remove('tab-pressed'));
      btn.addEventListener('mouseleave', () => btn.classList.remove('tab-pressed'));
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        if (this._currentTab === tab) {
          const now = Date.now();
          const last = this._lastClick[tab] || 0;
          if (now - last < this.cfg.DBL_CLICK) {
            this._lastClick[tab] = 0;
            this._onSwitch(tab, true);
            window.scrollTo(0, 0);
            return;
          }
          this._lastClick[tab] = now;
        }
        this.switchTo(tab);
      });
    }

    // ---- MoreButton 初始化 ----
    _initOverflow() {
      // 直接使用 Dropdown 的 wrap 作为 DOM 元素（不再手动创建重复节点）
      const dd = new Dropdown({
        mode: 'longpress',
        parent: null,
        longPress: 400,
        autoClose: 3000,
        wrapperCls: 'tab-more-wrap',
        triggerCls: 'tab-more-btn',
        dropdownCls: 'tab-more-dropdown',
        optionCls: 'tab-more-option',
      });

      const wrap = dd.getWrap();
      const btn = dd.getTrigger();
      btn.textContent = '更多';
      this._tabGroup.appendChild(wrap);

      let lastClickTime = 0;
      const self = this;
      btn.addEventListener('click', () => {
        if (dd._longPressFired) { dd._longPressFired = false; return; }
        const tab = btn.dataset.tab;
        if (!tab) return;
        const now = Date.now();
        if (now - lastClickTime < self.cfg.DBL_CLICK) {
          lastClickTime = 0;
          self._onSwitch(tab, true);
          window.scrollTo(0, 0);
          return;
        }
        lastClickTime = now;
        self.switchTo(tab);
      });

      this._moreWrap = wrap;
      this._moreBtn = btn;
      this._moreDD = dd;

      dbg('系统初化', 'TabBarBtn._initOverflow', {
        wrap在DOM: !!wrap.parentNode,
        wrap类名: wrap.className,
        btn文本: btn.textContent,
      });
    }

    // ---- 溢出重算 ----
    recalcOverflow() {
      const tabBtns = Array.from(this._tabGroup.querySelectorAll('.tab-btn[data-tab]'));
      if (tabBtns.length === 0) { dbg('布局变化', 'recalcOverflow: 无按钮'); return; }

      // 步骤1: 全部显示，隐藏更多按钮
      tabBtns.forEach(b => b.style.display = '');
      this._moreWrap.style.display = 'none';
      this._moreDD.close();

      // 步骤2: 计算容器宽度
      const navLeft = this._nav.querySelector('.nav-left');
      const channelSwitch = this._nav.querySelector('.channel-switch');
      const navLeftWidth = navLeft ? navLeft.offsetWidth : this._nav.offsetWidth;
      const channelWidth = channelSwitch ? channelSwitch.offsetWidth : 0;
      const navLeftGap = navLeft ? (parseFloat(getComputedStyle(navLeft).gap) || 0) : 0;
      const containerWidth = navLeftWidth - channelWidth - (channelWidth > 0 ? navLeftGap : 0);

      // 步骤3: 逐按钮测量
      const gap = 4;
      let accumulated = 0;
      let firstOverflowIdx = -1;
      const btnWidths = [];
      for (let i = 0; i < tabBtns.length; i++) {
        const w = tabBtns[i].offsetWidth;
        btnWidths.push({ tab: tabBtns[i].dataset.tab, w, acc: accumulated + w });
        if (accumulated + w > containerWidth - this.cfg.OVERFLOW_THRESHOLD) { firstOverflowIdx = i; break; }
        accumulated += w + gap;
      }

      dbg('布局变化', 'recalcOverflow测量', {
        navLeftWidth, channelWidth, navLeftGap, containerWidth,
        阈值: containerWidth - this.cfg.OVERFLOW_THRESHOLD,
        按钮数: tabBtns.length,
        按钮宽度: btnWidths,
        firstOverflowIdx,
        更多按钮在DOM: !!this._moreWrap.parentNode,
        更多按钮display: this._moreWrap.style.display,
      });

      // 步骤4: 无溢出则完成
      if (firstOverflowIdx === -1) { dbg('布局变化', 'recalcOverflow: 无溢出，全部可见'); return; }

      // 步骤5: 收起溢出tab + 最后一个可见tab
      const lastFitIdx = Math.max(0, firstOverflowIdx - 1);
      const lastFitTab = tabBtns[lastFitIdx];
      const allMoreTabs = [lastFitTab, ...tabBtns.slice(firstOverflowIdx)];

      allMoreTabs.forEach(b => b.style.display = 'none');
      this._moreWrap.style.display = '';
      if (lastFitTab.nextSibling) {
        this._tabGroup.insertBefore(this._moreWrap, lastFitTab.nextSibling);
      } else {
        this._tabGroup.appendChild(this._moreWrap);
      }

      const active = allMoreTabs.find(b => b.classList.contains('active')) || allMoreTabs[0];
      this._moreBtn.dataset.tab = active.dataset.tab;
      this._moreBtn.textContent = active.textContent + ' ▾';
      this._moreBtn.classList.toggle('active', active.classList.contains('active'));

      const items = allMoreTabs
        .filter(b => b !== active)
        .map(b => ({ text: b.textContent, value: b.dataset.tab }));
      this._moreDD.setItems(items);
      this._moreDD.onChange = (val) => { this.switchTo(val); };

      dbg('布局变化', 'recalcOverflow完成', {
        隐藏按钮: allMoreTabs.map(b => b.dataset.tab),
        更多按钮文本: this._moreBtn.textContent,
        下拉选项: items.map(i => i.text),
      });
    }

    // ---- 公开 API ----
    switchTo(tab) {
      if (this._currentTab === tab) return;
      dbg('用户操作', 'TabBarBtn.switchTo', { from: this._currentTab, to: tab });
      this._currentTab = tab;
      this._tabGroup.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
      });
      this._onSwitch(tab, false);
      requestAnimationFrame(() => this.recalcOverflow());
    }

    getCurrent() { return this._currentTab; }
    getNav() { return this._nav; }
  }

  /* ============================================================
     书签系统
     ============================================================ */

  function collapseAllTags() {
    document.querySelectorAll('.tag-item.expanded').forEach(el => {
      el.classList.remove('expanded');
    });
  }

  // 设置书签位置（相对于页面顶部）
  function updateTagPosition(item, scrollY) {
    const navH = dom.tabNav.offsetHeight;
    item.style.top = (scrollY + navH) + 'px';
  }

  function renderTags() {
    dom.tagLayer.innerHTML = '';
    if (currentTab === 'explore') return;
    const tags = getTags();
    tags.forEach(tag => {
      const el = createTagElement(tag);
      dom.tagLayer.appendChild(el);
    });
  }

  function createTagElement(tag) {
    const item = document.createElement('div');
    item.className = 'tag-item';
    item.dataset.tagId = tag.id;
    item.dataset.scrollY = tag.scrollY;
    updateTagPosition(item, tag.scrollY);

    // 收起状态：右侧小按钮
    const collapsed = document.createElement('div');
    collapsed.className = 'tag-collapsed';
    collapsed.innerHTML = '&#9664;';
    collapsed.title = tag.name;
    collapsed.addEventListener('click', (e) => {
      e.stopPropagation();
      collapseAllTags();
      item.classList.add('expanded');
      dbg('书签管理', '展开书签', { name: tag.name, id: tag.id });
      // 收起侧栏
      if (!dom.sidebar.classList.contains('collapsed')) {
        dom.sidebar.classList.add('collapsed');
        updateSidebarState();
      }
    });

    // 展开状态
    const expanded = document.createElement('div');
    expanded.className = 'tag-expanded';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'tag-name';
    nameSpan.textContent = tag.name;

    // 双击重命名
    nameSpan.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      dbg('书签管理', '重命名书签', { name: tag.name, id: tag.id });
      startRename(nameSpan, tag);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'tag-action-btn';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.title = '删除';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dbg('书签管理', '删除书签', { name: tag.name, id: tag.id });
      deleteTag(tag.id, item);
    });

    const collapseBtn = document.createElement('button');
    collapseBtn.className = 'tag-action-btn';
    collapseBtn.innerHTML = '&#9654;';
    collapseBtn.title = '收起';
    collapseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      item.classList.remove('expanded');
      dbg('书签管理', '收起书签', { name: tag.name, id: tag.id });
    });

    expanded.append(nameSpan, deleteBtn, collapseBtn);
    item.append(collapsed, expanded);

    // 长按拖动
    setupTagDrag(item, collapsed, tag);

    return item;
  }

  function startRename(nameSpan, tag) {
    nameSpan.contentEditable = 'true';
    nameSpan.focus();

    // 选中全部文字
    const range = document.createRange();
    range.selectNodeContents(nameSpan);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const finish = () => {
      nameSpan.contentEditable = 'false';
      const newName = nameSpan.textContent.trim();
      if (newName && newName !== tag.name) {
        tag.name = newName;
        updateTag(tag);
      } else {
        nameSpan.textContent = tag.name;
      }
    };

    nameSpan.addEventListener('blur', finish, { once: true });
    nameSpan.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        nameSpan.blur();
      }
    });
  }

  function updateTag(tag) {
    const tags = getTags();
    const idx = tags.findIndex(t => t.id === tag.id);
    if (idx !== -1) {
      tags[idx] = tag;
      setTags(tags);
    }
  }

  function deleteTag(tagId, el) {
    dbg('书签管理', 'deleteTag', { id: tagId, 剩余: getTags().length - 1 });
    el.remove();
    const tags = getTags().filter(t => t.id !== tagId);
    setTags(tags);
  }

  function resetClearBtn() {
    dom.btnClearTags.classList.remove('confirm-state');
    dom.btnClearTags.querySelector('.btn-label').textContent = '清空';
    clearTimeout(dom.btnClearTags._confirmTimer);
    dom.btnClearTags._confirmTimer = null;
  }
  function clearAllTags() {
    dbg('书签管理', 'clearAllTags', { tab: currentTab, 确认状态: dom.btnClearTags.classList.contains('confirm-state') });
    if (dom.btnClearTags.classList.contains('confirm-state')) {
      resetClearBtn();
      setTags([]);
      dom.tagLayer.innerHTML = '';
      showToast('已清空当前页书签');
    } else {
      dom.btnClearTags.classList.add('confirm-state');
      dom.btnClearTags.querySelector('.btn-label').textContent = '确认';
      dom.btnClearTags._confirmTimer = setTimeout(resetClearBtn, 3000);
    }
  }

  function addTag() {
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    dbg('书签管理', 'addTag', { tab: currentTab, scrollY, 当前书签数: getTags().length });
    const tags = getTags();
    const idx = getTagIdx();
    const tag = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: '书签' + idx,
      scrollY: scrollY
    };
    tags.push(tag);
    setTags(tags);

    const el = createTagElement(tag);
    dom.tagLayer.appendChild(el);
    showToast('已添加书签');
  }

  /* ---------- 书签拖动 ---------- */
  function setupTagDrag(item, collapsedBtn, tag) {
    let pressTimer = null;
    let isDragging = false;
    let offsetY = 0;

    const startDrag = (e) => {
      isDragging = true;
      collapsedBtn.classList.add('dragging');
      const clientY = e.clientY || e.touches[0].clientY;
      offsetY = clientY - (parseInt(item.style.top) || 0);
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onEnd);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onEnd);
      e.preventDefault();
    };

    const onMove = (e) => {
      if (!isDragging) return;
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);
      if (clientY === undefined) return;
      const navH = dom.tabNav.offsetHeight;
      const newTop = Math.max(navH, Math.min(clientY - offsetY, window.innerHeight - 28));
      item.style.top = newTop + 'px';
    };

    const onEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      collapsedBtn.classList.remove('dragging');
      clearTimeout(pressTimer);
      const navH = dom.tabNav.offsetHeight;
      tag.scrollY = Math.max(0, (parseInt(item.style.top) || 0) - navH + window.scrollY);
      item.dataset.scrollY = tag.scrollY;
      updateTag(tag);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };

    // 长按检测
    collapsedBtn.addEventListener('mousedown', (e) => {
      pressTimer = setTimeout(() => startDrag(e), 400);
    });
    collapsedBtn.addEventListener('touchstart', (e) => {
      pressTimer = setTimeout(() => startDrag(e), 400);
    }, { passive: false });

    // 普通点击取消长按计时
    collapsedBtn.addEventListener('mouseup', () => clearTimeout(pressTimer));
    collapsedBtn.addEventListener('mouseleave', () => clearTimeout(pressTimer));
  }

  /* ---------- 书签跳转 ---------- */
  function jumpToTag(direction) {
    const tags = getTags();
    if (tags.length === 0) return;
    dbg('书签管理', 'jumpToTag', { direction, 书签数: tags.length });

    const scrollY = window.scrollY || document.documentElement.scrollTop;
    let target = null;

    if (direction === 'prev') {
      for (let i = tags.length - 1; i >= 0; i--) {
        if (tags[i].scrollY < scrollY - 10) {
          target = tags[i];
          break;
        }
      }
      if (!target) return;
    } else {
      for (let i = 0; i < tags.length; i++) {
        if (tags[i].scrollY > scrollY + 10) {
          target = tags[i];
          break;
        }
      }
      if (!target) return;
    }

    window.scrollTo(0, target.scrollY);
  }

  /* ============================================================
     左侧栏
     ============================================================ */

  function updateSidebarState() {
    const collapsed = dom.sidebar.classList.contains('collapsed');
    dom.sidebarExpand.style.display = collapsed ? 'flex' : 'none';
  }

  function setupSidebar() {
    updateSidebarState();

    dom.sidebarExpand.addEventListener('click', () => {
      dbg('用户操作', '侧栏展开', { collapsed: dom.sidebar.classList.contains('collapsed') });
      dom.sidebar.classList.toggle('collapsed');
      updateSidebarState();
    });

    dom.btnPrevTag.addEventListener('click', () => jumpToTag('prev'));
    dom.btnAddTag.addEventListener('click', addTag);
    dom.btnNextTag.addEventListener('click', () => jumpToTag('next'));
    dom.btnClearTags.addEventListener('click', clearAllTags);

    // 点击侧边栏外部自动收起
    document.addEventListener('click', (e) => {
      if (!dom.sidebar.classList.contains('collapsed') &&
          !dom.sidebar.contains(e.target) &&
          !dom.sidebarExpand.contains(e.target)) {
        dom.sidebar.classList.add('collapsed');
        updateSidebarState();
      }
    });
  }

  /* ============================================================
     全屏事件绑定
     ============================================================ */

  function setupFullscreen() {
    dom.fullscreenClose.addEventListener('click', closeFullscreen);
    dom.zoomIn.addEventListener('click', zoomIn);
    dom.zoomOut.addEventListener('click', zoomOut);
    dom.zoomReset.addEventListener('click', zoomReset);

    // ESC 关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dom.fullscreenModal.classList.contains('open')) {
        closeFullscreen();
      }
    });

    // 点击背景关闭
    dom.fullscreenModal.addEventListener('click', (e) => {
      if (e.target === dom.fullscreenModal || e.target.classList.contains('fullscreen-media-wrap')) {
        closeFullscreen();
      }
    });

    // 滚轮缩放
    dom.fullscreenModal.addEventListener('wheel', (e) => {
      if (!dom.fullscreenModal.classList.contains('open')) return;
      e.preventDefault();
      if (e.deltaY < 0) zoomIn();
      else zoomOut();
    }, { passive: false });

    // 全屏内拖拽平移
    dom.fullscreenMedia.addEventListener('mousedown', (e) => {
      if (fsScale <= 1) return;
      fsDragging = true;
      fsDragStart = { x: e.clientX - fsTranslateX, y: e.clientY - fsTranslateY };
      dom.fullscreenMedia.classList.add('grabbing');
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!fsDragging) return;
      fsTranslateX = e.clientX - fsDragStart.x;
      fsTranslateY = e.clientY - fsDragStart.y;
      applyFsTransform();
    });

    document.addEventListener('mouseup', () => {
      fsDragging = false;
      dom.fullscreenMedia.classList.remove('grabbing');
    });

    // 触摸缩放（双指）
    let lastTouchDist = 0;
    dom.fullscreenModal.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        lastTouchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    }, { passive: true });

    dom.fullscreenModal.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (lastTouchDist > 0) {
          const scale = dist / lastTouchDist;
          fsScale = Math.max(0.2, Math.min(10, fsScale * scale));
          applyFsTransform();
        }
        lastTouchDist = dist;
      }
    }, { passive: false });
  }

  /* ============================================================
     回到顶部按钮
     ============================================================ */

  function setupBackToTop() {
    const btn = dom.btnBackTop;
    let visible = false;

    function updateVisibility() {
      const show = window.scrollY > window.innerHeight;
      if (show !== visible) {
        visible = show;
        btn.classList.toggle('visible', show);
      }
    }

    window.addEventListener('scroll', updateVisibility, { passive: true });
    updateVisibility();

    btn.addEventListener('click', () => window.scrollTo(0, 0));
  }

  /* ============================================================
     列数切换
     ============================================================ */

  function applyColCount() {
    dbg(initializing ? '系统初化' : '布局变化', 'applyColCount', { colCount });
    dom.gridContainer.style.setProperty('--col-count', colCount);
    storage.set('colCount', colCount);

    // 更新按钮状态
    dom.colSwitch.querySelectorAll('.col-btn').forEach(btn => {
      const n = parseInt(btn.dataset.col);
      btn.classList.toggle('active', n === colCount);
      btn.classList.toggle('disabled', n < minCols || n > maxCols);
    });
  }

  function setupColSwitch() {
    applyColCount();

    // 手机端禁用超出范围的列数按钮
    dom.colSwitch.querySelectorAll('.col-btn').forEach(btn => {
      const n = parseInt(btn.dataset.col);
      if (n > maxCols) {
        btn.classList.add('disabled-btn');
        btn.style.pointerEvents = 'none';
      }
    });

    dom.colSwitch.querySelectorAll('.col-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const n = parseInt(btn.dataset.col);
        if (n < minCols || n > maxCols) return;
        if (n === colCount) return;
        dbg('用户操作', '列数按钮点击', { from: colCount, to: n });
        colCount = n;
        CARDS_PER_PAGE = ROWS_PER_PAGE * colCount;
        applyColCount();
        rebuildOriginalColumns();
      });
    });
  }

  /* ============================================================
     主题切换
     ============================================================ */

  let themeSelectAPI = null;
  let channelSelectAPI = null;

  function applyTheme(index) {
    themeIndex = Math.max(0, Math.min(THEMES.length - 1, index));
    const t = thm();
    dbg(initializing ? '系统初化' : '用户操作', 'applyTheme', { name: t.name, index });
    const root = document.documentElement;
    THEME_KEYS.forEach((k, i) => { root.style.setProperty(k, t.colors[i]); });
    document.body.setAttribute('data-theme', t.value);
    storage.set('themeIndex', themeIndex);
    if (themeSelectAPI) themeSelectAPI.setValue(themeIndex);
  }

  function setupTheme() {
    const el = dom.themeSwitch;
    if (!el) return;
    const parent = el.parentNode;
    parent.removeChild(el);

    themeSelectAPI = new Dropdown({
      mode: 'click',
      parent: parent,
      items: THEMES.map((t, i) => ({ text: t.name, value: i })),
      onChange: (val) => applyTheme(Number(val)),
    });
    applyTheme(themeIndex);
  }

  function setupConfig() {
    const container = dom.channelSwitch;
    if (!container) return;
    container.innerHTML = '';

    if (CHANNEL_CONFIGS.length === 0) {
      const span = document.createElement('span');
      span.className = 'channel-placeholder';
      span.textContent = '无频道';
      container.appendChild(span);
      return;
    }

    channelSelectAPI = new Dropdown({
      mode: 'click',
      parent: container,
      items: CHANNEL_CONFIGS.map((c, i) => ({ text: c.name, value: i })),
      onChange: (val) => {
        const newIndex = parseInt(val);
        if (newIndex === channelIndex) return;
        dbg('用户操作', '频道切换', { from: CHANNEL_CONFIGS[channelIndex].name, to: CHANNEL_CONFIGS[newIndex].name, reload: true });
        storage.set('channelIndex', newIndex);
        location.reload();
      },
      onOpen: () => {
        if (!dom.sidebar.classList.contains('collapsed')) {
          dom.sidebar.classList.add('collapsed');
          updateSidebarState();
        }
        collapseAllTags();
      },
    });
    channelSelectAPI.setValue(channelIndex);
  }


  /* ============================================================
     视窗比例切换
     ============================================================ */

  function applyRatio(ratio) {
    dbg(initializing ? '系统初化' : '布局变化', 'applyRatio', { from: mediaRatio, to: ratio });
    mediaRatio = ratio;
    storage.set('mediaRatio', ratio);

    const isOriginal = ratio === 'original';
    dom.gridContainer.classList.toggle('layout-original', isOriginal);

    if (!isOriginal) {
      const padding = RATIO_MAP[ratio];
      const aspectRatio = (100 / padding).toFixed(4);
      dom.gridContainer.style.setProperty('--media-ratio', aspectRatio);
    } else {
      dom.gridContainer.style.removeProperty('--media-ratio');
    }

    // 更新按钮状态
    dom.ratioSwitch.querySelectorAll('.ratio-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.ratio === ratio);
    });
  }

  function setupRatio() {
    applyRatio(mediaRatio);

    dom.ratioSwitch.querySelectorAll('.ratio-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const newRatio = btn.dataset.ratio;
        if (newRatio === mediaRatio) return;
        dbg('用户操作', '比例按钮点击', { from: mediaRatio, to: newRatio });
        applyRatio(newRatio);
      });
    });
  }

  /* ============================================================
     设置面板
     ============================================================ */

  function toggleSettingsPanel(open) {
    if (open) {
      dom.settingsPanel.classList.add('open');
    } else {
      dom.settingsPanel.classList.remove('open');
      if (channelSelectAPI && channelSelectAPI.isOpen()) channelSelectAPI.close();
      if (themeSelectAPI && themeSelectAPI.isOpen()) themeSelectAPI.close();
    }
  }

  function setupSettings() {
    if (!dom.settingsToggle || !dom.settingsClose) return;
    dom.settingsToggle.addEventListener('click', () => {
      toggleSettingsPanel(!dom.settingsPanel.classList.contains('open'));
    });

    dom.settingsClose.addEventListener('click', () => {
      toggleSettingsPanel(false);
    });

    // 点击面板外部关闭（坐标判断，兼容body-append的下拉）
    document.addEventListener('click', (e) => {
      if (dom.settingsPanel.classList.contains('open') &&
          !isPointInElement(e.clientX, e.clientY, dom.settingsPanel) &&
          !dom.settingsToggle.contains(e.target) &&
          !e.target.closest('.custom-select-dropdown')) {
        toggleSettingsPanel(false);
      }

      // 点击书签外部收起所有书签
      if (!e.target.closest('.tag-item')) {
        collapseAllTags();
      }
    });

    // 设置面板展开时：鼠标在面板/下拉列表上滚动，鼠标不在其上则收起面板
    document.addEventListener('wheel', (e) => {
      if (!dom.settingsPanel.classList.contains('open')) return;
      if (isPointInElement(e.clientX, e.clientY, dom.settingsPanel)) {
        const scrollable = dom.settingsPanel.querySelector('.settings-body');
        if (scrollable) {
          e.preventDefault();
          scrollable.scrollTop += e.deltaY;
        }
        return;
      }
      // 检查是否在 body-append 的自定义下拉列表上
      const openDropdown = document.querySelector('.custom-select-dropdown');
      if (openDropdown && isPointInElement(e.clientX, e.clientY, openDropdown)) {
        e.preventDefault();
        openDropdown.scrollTop += e.deltaY;
        return;
      }
      toggleSettingsPanel(false);
    }, { passive: false });

    setupDataCache();
  }

  /* ============================================================
     数据缓存设置
     ============================================================ */

  function setupDataCache() {
    // 恢复周期按钮状态
    const cycle = getCacheCycle();
    dom.cacheCycleSwitch.querySelectorAll('.col-btn').forEach(btn => {
      btn.classList.toggle('active', +btn.dataset.cycle === cycle);
    });

    // 周期切换
    dom.cacheCycleSwitch.querySelectorAll('.col-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const newCycle = +btn.dataset.cycle;
        const oldCycle = getCacheCycle();
        if (oldCycle === newCycle) return;

        storage.set('cacheCycle', newCycle);
        dbg('储存变更', '数据更新周期切换', { 旧周期: oldCycle / 60000 + 'm', 新周期: newCycle / 60000 + 'm' });
        dom.cacheCycleSwitch.querySelectorAll('.col-btn').forEach(b => {
          b.classList.toggle('active', +b.dataset.cycle === newCycle);
        });
      });
    });

    // 恢复倒计时状态
    const refreshUntil = storage.get('refreshCooldownUntil', 0);
    if (Date.now() < refreshUntil) {
      startRefreshCountdown(refreshUntil);
    }

    // 立即更新数据按钮
    dom.btnForceRefresh.addEventListener('click', async () => {
      dbg('用户操作', '立即更新数据');
      if (dom.btnForceRefresh.classList.contains('disabled-btn')) {
        dbgW('用户操作', '冷却期跳过', { remaining: '60s' });
        return;
      }
      dom.btnForceRefresh.classList.add('disabled-btn');
      dom.btnForceRefresh.textContent = '更新中...';
      const success = await fetchAllDataFromServer();
      if (success) {
        const until = Date.now() + 60000;
        storage.set('refreshCooldownUntil', until);
        startRefreshCountdown(until);
        resetAndLoad(false);
        showToast('数据更新成功');
      } else {
        dom.btnForceRefresh.classList.remove('disabled-btn');
        dom.btnForceRefresh.textContent = '立即更新数据';
        showToast('数据更新失败，请重试');
      }
    });
  }

  function startRefreshCountdown(until) {
    dom.btnForceRefresh.classList.add('disabled-btn');
    const tick = () => {
      const remaining = Math.ceil((until - Date.now()) / 1000);
      if (remaining <= 0) {
        dom.btnForceRefresh.classList.remove('disabled-btn');
        dom.btnForceRefresh.textContent = '立即更新数据';
        storage.set('refreshCooldownUntil', 0);
        return;
      }
      dom.btnForceRefresh.textContent = '请等待' + remaining + '秒后再次更新';
      setTimeout(tick, 1000);
    };
    tick();
  }

  /* ============================================================
     初始化
     ============================================================ */

  function init() {
    dbg('系统初化', 'init开始', { 协议: location.protocol, 频道: cfg().name, dbPath: cfg().dbPath || '', db: cfg().dbName, 类型: cfg().mediaType, 范围: cfg().mediaIdMin + '-' + cfg().mediaIdMax, 后端: cfg().backend });
    updatePageTitle();
    updatePageIcon();

    // 频道配置覆盖浏览器储存
    const ch = cfg();
    if (ch.useTheme != null) {
      themeIndex = Math.max(0, Math.min(THEMES.length - 1, ch.useTheme));
      storage.set('themeIndex', themeIndex);
    }
    if (ch.useColCount != null) {
      colCount = Math.max(minCols, Math.min(maxCols, ch.useColCount));
      CARDS_PER_PAGE = ROWS_PER_PAGE * colCount;
      storage.set('colCount', colCount);
    }
    if (ch.useRatio != null && RATIO_MAP[ch.useRatio] !== undefined) {
      mediaRatio = ch.useRatio;
      storage.set('mediaRatio', mediaRatio);
    }
    // 刷新页面时回到顶部
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    tabBarBtn = new TabBarBtn(dom.tabNav, { onSwitch: _handleTabSwitch });
    setupTheme();
    setupConfig();
    setupRatio();
    setupSettings();
    setupSidebar();
    setupColSwitch();
    setupFullscreen();
    setupInfiniteScroll();
    setupBackToTop();

    // 设备类型变化时更新列数约束
    DeviceEnv.subscribe((type) => {
      dbg('布局变化', '设备类型变化', { type });
      maxCols = type === 'mobile' ? 2 : 5;
      if (colCount > maxCols) {
        colCount = maxCols;
        CARDS_PER_PAGE = ROWS_PER_PAGE * colCount;
      }
      setupColSwitch();
      tabBarBtn.recalcOverflow();
    });

    // 用户实际滚动时恢复加载
    window.addEventListener('scroll', () => {
      if (scrollPauseLoad) scrollPauseLoad = false;
    }, { passive: true });

    // 导航栏冻结+收起组件
    NavScroll.init(dom.tabNav);

    // Alt+滚轮加速滚动
    window.addEventListener('wheel', (e) => {
      if (e.altKey) {
        e.preventDefault();
        window.scrollBy(0, e.deltaY * 2.5);
      }
    }, { passive: false });

    // ResizeObserver 监听 nav-left 容器尺寸变化
    const navLeft = dom.tabNav.querySelector('.nav-left');
    if (navLeft) {
      let resizeTimer = null;
      const resizeObserver = new ResizeObserver(() => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => tabBarBtn.recalcOverflow(), 100);
      });
      resizeObserver.observe(navLeft);
    }

    // 字体加载完成后重新计算tab溢出
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => tabBarBtn.recalcOverflow());
    }

    // 点击二次确认按钮之外的区域，立即重置所有二次确认按钮
    document.addEventListener('click', (e) => {
      document.querySelectorAll('.confirm-state').forEach(el => {
        if (!el.contains(e.target)) {
          if (el === dom.btnClearTags) resetClearBtn();
          else if (el._resetConfirm) el._resetConfirm();
        }
      });
    });
    setupAnnouncement();

    // 从localStorage加载数据到内存，然后检查是否需要刷新
    loadLocalToMemory();
    checkAndRefreshData();

    // Tab切换流程：读取储存的tab指向，无则切换到首页
    const savedTab = storage.get('currentTab', 'home');
    switchTab(savedTab);

    initializing = false;
    dbg('系统初化', 'init完成', { 设备: DeviceEnv.type, tab: currentTab, 主题: THEMES[themeIndex].name, 列数: colCount, 比例: mediaRatio, 频道数: CHANNEL_CONFIGS.length, isFileProtocol, canAPI: canRequestAPI() });
  }

  // DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
