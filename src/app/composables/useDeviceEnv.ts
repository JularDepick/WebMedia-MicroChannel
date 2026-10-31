/* ============================================================
   设备环境判定
   基于特性检测与媒体查询, 不依赖 UA
   ============================================================ */

import { computed, ref, type ComputedRef, type Ref } from 'vue'

export type DeviceType = 'mobile' | 'tablet' | 'desktop'

const MOBILE: DeviceType = 'mobile'
const TABLET: DeviceType = 'tablet'
const DESKTOP: DeviceType = 'desktop'

interface MediaQueryBundle {
  narrow: MediaQueryList
  medium: MediaQueryList
  wide: MediaQueryList
  coarse: MediaQueryList
  fine: MediaQueryList
  hover: MediaQueryList
  noHover: MediaQueryList
  anyCoarse: MediaQueryList
  anyFine: MediaQueryList
}

/* 设备类型, 全局单例 */
const deviceTypeState = ref<DeviceType>('desktop')
const touchState = ref(false)
const listeners: Array<(type: DeviceType) => void> = []
let queries: MediaQueryBundle | null = null
let initialized = false

function detect(): DeviceType {
  if (typeof window === 'undefined' || !queries) return DESKTOP
  const width = window.innerWidth
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  const primaryCoarse = queries.coarse.matches
  const primaryFine = queries.fine.matches
  const canHover = queries.hover.matches
  const hasFinePointer = queries.anyFine.matches

  /* 手机: 主指针粗糙 + 不可悬停 + 窄屏 */
  if (primaryCoarse && !canHover && width <= 768) return MOBILE
  /* 平板: 主指针粗糙 + 不可悬停 + 中等屏幕 */
  if (primaryCoarse && !canHover && width <= 1024) return TABLET
  /* 平板横屏: 粗糙指针 + 宽屏 + 触摸设备 */
  if (primaryCoarse && hasTouch && !hasFinePointer) return TABLET
  /* 窄桌面: 精细指针且可悬停 */
  if (primaryFine && canHover) return DESKTOP
  /* 混合设备: 存在精细指针时偏桌面 */
  if (hasFinePointer) return DESKTOP
  return hasTouch ? TABLET : DESKTOP
}

function notify(): void {
  if (!queries) return
  touchState.value = queries.coarse.matches || 'ontouchstart' in window
  const next = detect()
  if (next === deviceTypeState.value) return
  deviceTypeState.value = next
  if (typeof document !== 'undefined') document.documentElement.dataset.device = next
  listeners.forEach((fn) => fn(next))
}

function init(): void {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  queries = {
    narrow: window.matchMedia('(max-width: 767px)'),
    medium: window.matchMedia('(min-width: 768px) and (max-width: 1024px)'),
    wide: window.matchMedia('(min-width: 1025px)'),
    coarse: window.matchMedia('(pointer: coarse)'),
    fine: window.matchMedia('(pointer: fine)'),
    hover: window.matchMedia('(hover: hover)'),
    noHover: window.matchMedia('(hover: none)'),
    anyCoarse: window.matchMedia('(any-pointer: coarse)'),
    anyFine: window.matchMedia('(any-pointer: fine)')
  }
  Object.values(queries).forEach((mq) => mq.addEventListener('change', notify))
  window.addEventListener('resize', notify, { passive: true })
  deviceTypeState.value = detect()
  touchState.value = queries.coarse.matches || 'ontouchstart' in window
  document.documentElement.dataset.device = deviceTypeState.value
}

export interface DeviceEnvContext {
  deviceType: Ref<DeviceType>
  isMobile: ComputedRef<boolean>
  isTablet: ComputedRef<boolean>
  isDesktop: ComputedRef<boolean>
  isTouch: Ref<boolean>
  init: () => void
  /* 订阅设备类型变化 */
  subscribe: (fn: (type: DeviceType) => void) => void
}

export function useDeviceEnv(): DeviceEnvContext {
  init()
  return {
    deviceType: deviceTypeState,
    isMobile: computed(() => deviceTypeState.value === MOBILE),
    isTablet: computed(() => deviceTypeState.value === TABLET),
    isDesktop: computed(() => deviceTypeState.value === DESKTOP),
    isTouch: touchState,
    init,
    subscribe: (fn: (type: DeviceType) => void) => {
      listeners.push(fn)
    }
  }
}
