/* ============================================================
   主题
   十套主题的 CSS 变量写入与持久化
   ============================================================ */

import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useStorage } from './useStorage'

/* 主题颜色键预设顺序, 与 colors 数组一一对应 */
const THEME_KEYS = [
  '--bg-primary', '--bg-secondary', '--bg-tertiary', '--bg-card',
  '--text-primary', '--text-secondary', '--text-muted',
  '--accent', '--accent-hover', '--accent-dim',
  '--link-color', '--link-underline',
  '--border', '--border-light',
  '--shadow-sm', '--shadow-md', '--shadow-lg',
  '--color-scheme'
]

export interface ThemeDefinition {
  name: string
  value: string
  colors: string[]
}

const SHADOW_LIGHT = ['0 2px 8px rgba(0,0,0,0.08)', '0 4px 20px rgba(0,0,0,0.12)', '0 8px 40px rgba(0,0,0,0.18)']
const SHADOW_SOFT = ['0 2px 8px rgba(0,0,0,0.06)', '0 4px 20px rgba(0,0,0,0.1)', '0 8px 40px rgba(0,0,0,0.15)']

/* 主题配置: colors 按 THEME_KEYS 顺序对应 */
export const THEMES: ThemeDefinition[] = [
  {
    name: '简约白',
    value: 'light',
    colors: [
      '#f0f0f2', '#ffffff', '#e8e8ec', '#ffffff',
      '#1a1a1e', '#666666', '#aaaaaa',
      '#ff6b35', '#e55a28', 'rgba(255,107,53,0.12)',
      '#ff6b35', 'rgba(255,107,53,0.3)',
      '#dddde0', '#cccccc',
      ...SHADOW_LIGHT,
      'light'
    ]
  },
  {
    name: '简约黑',
    value: 'dark',
    colors: [
      '#0a0a0b', '#141416', '#1e1e22', '#1a1a1e',
      '#e8e6e3', '#9a9a9a', '#5a5a5a',
      '#ff6b35', '#ff8555', 'rgba(255,107,53,0.15)',
      '#ff6b35', 'rgba(255,107,53,0.3)',
      '#2a2a2e', '#333338',
      '0 2px 8px rgba(0,0,0,0.3)', '0 4px 20px rgba(0,0,0,0.5)', '0 8px 40px rgba(0,0,0,0.7)',
      'dark'
    ]
  },
  {
    name: '玫瑰红',
    value: 'rose',
    colors: [
      '#f4e8ea', '#fef6f7', '#e8ccd2', '#fef6f7',
      '#2a0810', '#8a2838', '#b06878',
      '#b81838', '#d02048', 'rgba(184,24,56,0.12)',
      '#b81838', 'rgba(184,24,56,0.3)',
      '#d8b8c0', '#e0c4cc',
      ...SHADOW_LIGHT,
      'light'
    ]
  },
  {
    name: '可爱粉',
    value: 'pink',
    colors: [
      '#fdf4f8', '#fef7fb', '#f8dce8', '#fef7fb',
      '#2a0818', '#b06080', '#d0a0b8',
      '#f060a0', '#ff78b0', 'rgba(240,96,160,0.12)',
      '#f060a0', 'rgba(240,96,160,0.3)',
      '#f0c8d8', '#f4d4e0',
      ...SHADOW_SOFT,
      'light'
    ]
  },
  {
    name: '夏日橙',
    value: 'summerorange',
    colors: [
      '#fff8f0', '#fffbf7', '#ffe8d0', '#fffbf7',
      '#2a1808', '#b06820', '#d0a060',
      '#f07020', '#ff8838', 'rgba(240,112,32,0.12)',
      '#f07020', 'rgba(240,112,32,0.3)',
      '#f0d8c0', '#f4e0cc',
      ...SHADOW_SOFT,
      'light'
    ]
  },
  {
    name: '古朴黄',
    value: 'orange',
    colors: [
      '#faf6ee', '#fffcf5', '#f0e8d0', '#fffcf5',
      '#2a2008', '#907020', '#b8a060',
      '#c08020', '#d89830', 'rgba(192,128,32,0.12)',
      '#c08020', 'rgba(192,128,32,0.3)',
      '#e4d8b8', '#ece0c4',
      ...SHADOW_SOFT,
      'light'
    ]
  },
  {
    name: '初春绿',
    value: 'springgreen',
    colors: [
      '#f0f8f0', '#f5fcf5', '#d8f0d8', '#f5fcf5',
      '#0a200a', '#308030', '#80b080',
      '#28a030', '#38b840', 'rgba(40,160,48,0.12)',
      '#28a030', 'rgba(40,160,48,0.3)',
      '#b8d8b8', '#c8e0c8',
      ...SHADOW_SOFT,
      'light'
    ]
  },
  {
    name: '高原青',
    value: 'plateau',
    colors: [
      '#eef8f8', '#f4fbfa', '#d0ece8', '#f4fbfa',
      '#082820', '#208878', '#70b0a8',
      '#189888', '#28b0a0', 'rgba(24,152,136,0.12)',
      '#189888', 'rgba(24,152,136,0.3)',
      '#b0d8d0', '#c0e0d8',
      ...SHADOW_SOFT,
      'light'
    ]
  },
  {
    name: '天空蓝',
    value: 'blue',
    colors: [
      '#f0f6fc', '#f5f9fe', '#dce8f8', '#f5f9fe',
      '#0a1828', '#3070b0', '#88a8d0',
      '#2080e0', '#3890f0', 'rgba(32,128,224,0.12)',
      '#2080e0', 'rgba(32,128,224,0.3)',
      '#b8d0e8', '#c8dcf0',
      ...SHADOW_SOFT,
      'light'
    ]
  },
  {
    name: '太空紫',
    value: 'purple',
    colors: [
      '#f4f0fa', '#f9f6fd', '#e4d8f4', '#f9f6fd',
      '#18082a', '#7040a0', '#a888c8',
      '#8030c0', '#9848d8', 'rgba(128,48,192,0.12)',
      '#8030c0', 'rgba(128,48,192,0.3)',
      '#d0b8e8', '#dcc8f0',
      ...SHADOW_SOFT,
      'light'
    ]
  }
]

/* 主题索引, 全局单例 */
const themeIndexState = ref(0)
let initialized = false

function clampIndex(value: number): number {
  const index = Number.isFinite(value) ? Math.trunc(value) : 0
  return Math.max(0, Math.min(THEMES.length - 1, index))
}

export interface ThemeContext {
  themes: ThemeDefinition[]
  themeIndex: Ref<number>
  currentTheme: ComputedRef<ThemeDefinition>
  init: () => void
  /* 写入主题 CSS 变量并持久化 */
  applyTheme: (index: number) => void
  /* 仅写入当前主题变量, 不改变索引 */
  refreshTheme: () => void
}

export function useTheme(): ThemeContext {
  const storage = useStorage()

  function init(): void {
    if (initialized) return
    initialized = true
    themeIndexState.value = clampIndex(storage.read<number>('themeIndex', 0))
  }

  function refreshTheme(): void {
    const theme = THEMES[themeIndexState.value]
    if (!theme || typeof document === 'undefined') return
    const root = document.documentElement
    THEME_KEYS.forEach((key, index) => {
      root.style.setProperty(key, theme.colors[index] || '')
    })
    if (document.body) document.body.setAttribute('data-theme', theme.value)
  }

  function applyTheme(index: number): void {
    themeIndexState.value = clampIndex(index)
    storage.write('themeIndex', themeIndexState.value)
    refreshTheme()
  }

  init()

  return {
    themes: THEMES,
    themeIndex: themeIndexState,
    currentTheme: computed(() => THEMES[themeIndexState.value]),
    init,
    applyTheme,
    refreshTheme
  }
}
