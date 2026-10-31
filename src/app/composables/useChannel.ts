/* ============================================================
   频道索引与配置
   频道切换会取消旧加载并整页重载, 保证存储按键位隔离
   ============================================================ */

import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { CHANNEL_CONFIGS } from '~~/shared/constants/channels'
import type { ChannelConfig } from '~~/shared/types/channel'
import { useStorage } from './useStorage'

/* 频道索引, 全局单例 */
const channelIndexState = ref(0)
/* 加载代次: 每次切换频道或重置加载时递增 */
const generationState = ref(0)
/* 加载作废标记 */
const cancelledState = ref(false)
let initialized = false

function clampIndex(value: number): number {
  const max = Math.max(0, CHANNEL_CONFIGS.length - 1)
  const index = Number.isFinite(value) ? Math.trunc(value) : 0
  return Math.max(0, Math.min(max, index))
}

export interface ChannelContext {
  /* 当前频道索引 */
  channelIndex: ComputedRef<number>
  /* 当前频道配置 */
  config: ComputedRef<ChannelConfig>
  /* 频道列表 */
  channels: ChannelConfig[]
  /* 频道隔离的存储键: cfg_<频道id>_<键> */
  cfgKey: (key: string) => string
  /* 初始化: 读取并纠正索引 */
  init: () => void
  /* 切换频道: 写存储并整页重载 */
  switchChannel: (index: number) => void
  /* 取消频道加载: 递增代次并标记作废 */
  cancelChannelLoading: () => void
  /* 恢复加载状态 */
  resumeLoading: () => void
  /* 当前加载代次 */
  loadGeneration: Ref<number>
  /* 加载是否已作废 */
  cancelled: Ref<boolean>
  /* 判断代次是否过期 */
  isStale: (generation: number) => boolean
}

export function useChannel(): ChannelContext {
  const storage = useStorage()

  function init(): void {
    if (initialized) return
    initialized = true
    channelIndexState.value = clampIndex(storage.read<number>('channelIndex', 0))
  }

  function cfgKey(key: string): string {
    const config = CHANNEL_CONFIGS[channelIndexState.value]
    return 'cfg_' + (config ? config.id : 'unknown') + '_' + key
  }

  function cancelChannelLoading(): void {
    generationState.value += 1
    cancelledState.value = true
  }

  function resumeLoading(): void {
    cancelledState.value = false
  }

  function isStale(generation: number): boolean {
    return generation !== generationState.value || cancelledState.value
  }

  function switchChannel(index: number): void {
    const next = clampIndex(index)
    if (next === channelIndexState.value) return
    cancelChannelLoading()
    storage.write('channelIndex', next)
    storage.write('currentTab', 'home')
    if (typeof location !== 'undefined') location.reload()
  }

  init()

  return {
    channelIndex: computed(() => channelIndexState.value),
    config: computed(() => CHANNEL_CONFIGS[channelIndexState.value]),
    channels: CHANNEL_CONFIGS,
    cfgKey,
    init,
    switchChannel,
    cancelChannelLoading,
    resumeLoading,
    loadGeneration: generationState,
    cancelled: cancelledState,
    isStale
  }
}
