/* ============================================================
   显示设置
   主题、列数、视窗比例、缓存周期、卡片标签栏与数据立即刷新
   ============================================================ */

import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { CACHE_CYCLE_OPTIONS, ROWS_PER_PAGE } from '~~/shared/constants/site'
import type { ChannelConfig } from '~~/shared/types/channel'
import { RATIO_PADDING } from '../utils/layout'
import { useDeviceEnv } from './useDeviceEnv'
import { useStorage } from './useStorage'
import { useTheme } from './useTheme'

/* 每页加载行数沿用站点常量, 卡片总数 = ROWS_PER_PAGE * 列数 */
export { ROWS_PER_PAGE }
/* 最小列数 */
export const MIN_COLUMNS = 1
/* 桌面端最大列数 */
export const MAX_COLUMNS_DESKTOP = 5
/* 移动端最大列数 */
export const MAX_COLUMNS_MOBILE = 2
/* 手动刷新冷却时长(ms) */
export const REFRESH_COOLDOWN = 60000
/* 默认数据更新周期(ms) */
export const DEFAULT_CACHE_CYCLE = 600000

/* 列数, 全局单例 */
const colCountState = ref(3)
/* 视窗比例, 全局单例 */
const mediaRatioState = ref('original')
/* 卡片标签栏开关 */
const labelBannerState = ref(true)
/* 数据更新周期 */
const cacheCycleState = ref(DEFAULT_CACHE_CYCLE)
/* 立即刷新状态 */
const refreshingState = ref(false)
const refreshRemainingState = ref(0)
let refreshTimer: ReturnType<typeof setInterval> | null = null
let initialized = false

export interface SettingsContext {
  colCount: Ref<number>
  mediaRatio: Ref<string>
  showLabelBanner: Ref<boolean>
  cacheCycle: Ref<number>
  maxColumns: ComputedRef<number>
  cacheCycleOptions: typeof CACHE_CYCLE_OPTIONS
  refreshDisabled: ComputedRef<boolean>
  refreshButtonText: ComputedRef<string>
  init: () => void
  /* 应用频道级覆盖配置 */
  applyChannelOverrides: (config: ChannelConfig) => void
  setColCount: (value: number) => void
  setMediaRatio: (ratio: string) => void
  setShowLabelBanner: (value: boolean) => void
  setCacheCycle: (value: number) => void
  isRefreshing: () => boolean
  beginRefresh: () => void
  endRefresh: () => void
  startRefreshCountdown: (until: number) => void
  stopRefreshCountdown: () => void
}

export function useSettings(): SettingsContext {
  const storage = useStorage()
  const device = useDeviceEnv()
  const theme = useTheme()

  const maxColumns = computed(() =>
    device.isMobile.value ? MAX_COLUMNS_MOBILE : MAX_COLUMNS_DESKTOP
  )

  function clampColumns(value: number): number {
    const columns = Number.isFinite(value) ? Math.trunc(value) : MIN_COLUMNS
    return Math.max(MIN_COLUMNS, Math.min(maxColumns.value, columns))
  }

  function init(): void {
    if (initialized) return
    initialized = true
    const defaultColumns = device.isMobile.value ? 2 : 3
    colCountState.value = clampColumns(storage.read<number>('colCount', defaultColumns))
    mediaRatioState.value = storage.read<string>('mediaRatio', device.isMobile.value ? '1:1' : 'original')
    labelBannerState.value = storage.read<boolean>('showLabelBanner', true)
    cacheCycleState.value = storage.read<number>('cacheCycle', DEFAULT_CACHE_CYCLE)
    theme.init()
  }

  function applyChannelOverrides(config: ChannelConfig): void {
    if (config.useTheme !== null && config.useTheme !== undefined) {
      theme.applyTheme(config.useTheme)
    }
    if (config.useColCount !== null && config.useColCount !== undefined) {
      setColCount(config.useColCount)
    }
    if (config.useRatio !== null && config.useRatio !== undefined && RATIO_PADDING[config.useRatio] !== undefined) {
      setMediaRatio(config.useRatio)
    }
  }

  function setColCount(value: number): void {
    const columns = clampColumns(value)
    colCountState.value = columns
    storage.write('colCount', columns)
  }

  function setMediaRatio(ratio: string): void {
    if (ratio !== 'original' && RATIO_PADDING[ratio] === undefined) return
    mediaRatioState.value = ratio
    storage.write('mediaRatio', ratio)
  }

  function setShowLabelBanner(value: boolean): void {
    labelBannerState.value = value
    storage.write('showLabelBanner', value)
  }

  function setCacheCycle(value: number): void {
    cacheCycleState.value = value
    storage.write('cacheCycle', value)
  }

  function isRefreshing(): boolean {
    return refreshingState.value
  }

  function beginRefresh(): void {
    refreshingState.value = true
  }

  function endRefresh(): void {
    refreshingState.value = false
  }

  function stopRefreshCountdown(): void {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
    refreshRemainingState.value = 0
  }

  function startRefreshCountdown(until: number): void {
    stopRefreshCountdown()
    const tick = () => {
      const remaining = Math.ceil((until - Date.now()) / 1000)
      if (remaining <= 0) {
        stopRefreshCountdown()
        storage.write('refreshCooldownUntil', 0)
        return
      }
      refreshRemainingState.value = remaining
    }
    tick()
    if (refreshRemainingState.value > 0) {
      refreshTimer = setInterval(tick, 1000)
    }
  }

  const refreshDisabled = computed(() => refreshingState.value || refreshRemainingState.value > 0)
  const refreshButtonText = computed(() => {
    if (refreshingState.value) return '更新中...'
    if (refreshRemainingState.value > 0) return '请等待' + refreshRemainingState.value + '秒后再次更新'
    return '立即更新数据'
  })

  init()
  /* 恢复上次未走完的冷却倒计时 */
  const restoredUntil = storage.read<number>('refreshCooldownUntil', 0)
  if (typeof window !== 'undefined' && restoredUntil > Date.now()) startRefreshCountdown(restoredUntil)

  return {
    colCount: colCountState,
    mediaRatio: mediaRatioState,
    showLabelBanner: labelBannerState,
    cacheCycle: cacheCycleState,
    maxColumns,
    cacheCycleOptions: CACHE_CYCLE_OPTIONS,
    refreshDisabled,
    refreshButtonText,
    init,
    applyChannelOverrides,
    setColCount,
    setMediaRatio,
    setShowLabelBanner,
    setCacheCycle,
    isRefreshing,
    beginRefresh,
    endRefresh,
    startRefreshCountdown,
    stopRefreshCountdown
  }
}
