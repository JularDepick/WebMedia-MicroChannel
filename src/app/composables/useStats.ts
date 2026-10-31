/* ============================================================
   统计与标签数据
   六个计数槽位、标签数据、localStorage 缓存、区间拉取与增量合并
   ============================================================ */

import { reactive, ref, type Ref } from 'vue'
import type { ChannelDataPayload, CountItem, LabelRecord } from '~~/shared/types/channel'
import { createChannelApi } from './useApiClient'
import { useChannel } from './useChannel'
import { useStorage } from './useStorage'

/* 六个统计槽位 */
export type StatSlot = 'hot' | 'topliked' | 'featured' | 'downloads' | 'shares' | 'blocks'

export const STAT_SLOTS: StatSlot[] = ['hot', 'topliked', 'featured', 'downloads', 'shares', 'blocks']
/* stats 表拆分出的槽位 */
export const STAT_TABLE_SLOTS: StatSlot[] = ['hot', 'topliked', 'featured']
/* extra 表拆分出的槽位 */
export const EXTRA_TABLE_SLOTS: StatSlot[] = ['downloads', 'shares', 'blocks']
/* 浏览冷却: 图片 */
export const VIEW_COOLDOWN_IMG = 30000
/* 浏览冷却: 视频与音频 */
export const VIEW_COOLDOWN_MEDIA = 60000
/* 默认数据更新周期(ms) */
const DEFAULT_CACHE_CYCLE = 600000

interface SlotCache {
  data: CountItem[]
  lastFetchTime: number
}

const slots = reactive<Record<StatSlot, CountItem[]>>({
  hot: [],
  topliked: [],
  featured: [],
  downloads: [],
  shares: [],
  blocks: []
})

const labelsState = ref<LabelRecord[]>([])
const lastFetchTimeState = ref(0)
const likesState = ref<number[]>([])
const favoritesState = ref<number[]>([])
const blocksState = ref<number[]>([])
const likesNotifiedState = ref<number[]>([])
const favsNotifiedState = ref<number[]>([])
const sharesNotifiedState = ref<number[]>([])
const downloadsNotifiedState = ref<number[]>([])
const blocksNotifiedState = ref<number[]>([])
let loaded = false

/* 快速排序, 与主实现一致的比较器语义 */
export function quickSort<T>(list: T[], compare: (a: T, b: T) => number): T[] {
  if (list.length <= 1) return list
  const pivot = list[Math.floor(list.length / 2)]
  const left: T[] = []
  const middle: T[] = []
  const right: T[] = []
  for (const item of list) {
    const result = compare(item, pivot)
    if (result < 0) left.push(item)
    else if (result > 0) right.push(item)
    else middle.push(item)
  }
  return [...quickSort(left, compare), ...middle, ...quickSort(right, compare)]
}

/* 计数降序, 同数按编号升序 */
function byCountDesc(a: CountItem, b: CountItem): number {
  return b.count !== a.count ? b.count - a.count : a.id - b.id
}

export interface StatsContext {
  /* 六个槽位的计数表 */
  slots: Record<StatSlot, CountItem[]>
  labels: Ref<LabelRecord[]>
  lastFetchTime: Ref<number>
  init: () => void
  /* 内存写入 localStorage */
  syncSlot: (slot: StatSlot) => void
  /* 读取槽位计数表, 空时生成默认全量 */
  readSlot: (slot: StatSlot) => CountItem[]
  /* 读取单个计数 */
  getCount: (slot: StatSlot, id: number) => number
  /* 计数自增并落盘, 返回新计数 */
  incrementCount: (slot: StatSlot, id: number, delta?: number) => number
  /* 区间拉取并增量合并 */
  fetchAllDataFromServer: () => Promise<boolean>
  /* 缓存过期时自动拉取 */
  checkAndRefreshData: () => Promise<boolean>
  getCacheCycle: () => number
  /* 标签 */
  getLabelsForMedia: (id: number) => string[]
  /* 浏览记录与冷却 */
  recordView: (id: number) => number
  isViewCooldown: (id: number, cooldown: number) => boolean
  /* 点赞 */
  isLiked: (id: number) => boolean
  toggleLike: (id: number) => boolean
  removeLike: (id: number) => void
  isLikeNotified: (id: number) => boolean
  markLikeNotified: (id: number) => void
  /* 收藏 */
  isFavorited: (id: number) => boolean
  toggleFavorite: (id: number) => boolean
  removeFavorite: (id: number) => void
  getFavorites: () => number[]
  isFavNotified: (id: number) => boolean
  markFavNotified: (id: number) => void
  /* 屏蔽 */
  isBlocked: (id: number) => boolean
  blockMedia: (id: number) => void
  unblockMedia: (id: number) => void
  isBlockNotified: (id: number) => boolean
  markBlockNotified: (id: number) => void
  /* 分享与下载的后端通知标记 */
  isShareNotified: (id: number) => boolean
  markShareNotified: (id: number) => void
  isDownloadNotified: (id: number) => boolean
  markDownloadNotified: (id: number) => void
  /* 计数上报 */
  notifyServer: (action: string, id: number) => void
}

export function useStats(): StatsContext {
  const storage = useStorage()
  const channel = useChannel()

  function cfg(): string {
    return channel.config.value.id
  }

  function cfgKey(key: string): string {
    return 'cfg_' + cfg() + '_' + key
  }

  function cacheKey(slot: StatSlot): string {
    return 'cache_' + cfg() + '_' + slot
  }

  function labelsCacheKey(): string {
    return 'cache_' + cfg() + '_labels'
  }

  function canRequestAPI(): boolean {
    if (typeof location === 'undefined') return true
    if (location.protocol !== 'file:') return true
    return /^https?:\/\//i.test(channel.config.value.backend)
  }

  function buildDefaultCounts(): CountItem[] {
    const items: CountItem[] = []
    const config = channel.config.value
    for (let id = config.mediaIdMin; id <= config.mediaIdMax; id++) items.push({ id, count: 0 })
    return items
  }

  function buildDefaultLabels(): LabelRecord[] {
    const items: LabelRecord[] = []
    const config = channel.config.value
    for (let id = config.mediaIdMin; id <= config.mediaIdMax; id++) items.push({ id, labels: [] })
    return items
  }

  function syncSlot(slot: StatSlot): void {
    storage.write(cacheKey(slot), { data: slots[slot], lastFetchTime: lastFetchTimeState.value })
  }

  function syncLabels(): void {
    storage.write(labelsCacheKey(), { data: labelsState.value, lastFetchTime: lastFetchTimeState.value })
  }

  function loadLabelsFromStorage(): void {
    const cached = storage.read<SlotCache | null>(labelsCacheKey(), null)
    if (cached && Array.isArray(cached.data)) {
      labelsState.value = cached.data as unknown as LabelRecord[]
    } else {
      labelsState.value = buildDefaultLabels()
    }
  }

  function loadLocalToMemory(): void {
    lastFetchTimeState.value = storage.read<number>(cfgKey('lastFetchTime'), 0)
    if (lastFetchTimeState.value === 0) {
      /* 无本地数据: 写入默认全量数据, 拉取时间保持 0 以保证绝对过期 */
      const defaults = buildDefaultCounts()
      for (const slot of STAT_SLOTS) {
        storage.write(cacheKey(slot), { data: defaults.map((item) => ({ id: item.id, count: item.count })), lastFetchTime: 0 })
      }
      storage.write(cfgKey('lastFetchTime'), 0)
    }
    for (const slot of STAT_SLOTS) {
      const cached = storage.read<SlotCache | null>(cacheKey(slot), null)
      slots[slot] = cached && Array.isArray(cached.data) ? cached.data : []
    }
    loadLabelsFromStorage()
  }

  function loadMarks(): void {
    likesState.value = storage.read<number[]>(cfgKey('likes'), [])
    favoritesState.value = storage.read<number[]>(cfgKey('favorites'), [])
    blocksState.value = storage.read<number[]>(cfgKey('blocks'), [])
    likesNotifiedState.value = storage.read<number[]>(cfgKey('likesNotified'), [])
    favsNotifiedState.value = storage.read<number[]>(cfgKey('favsNotified'), [])
    sharesNotifiedState.value = storage.read<number[]>(cfgKey('sharesNotified'), [])
    downloadsNotifiedState.value = storage.read<number[]>(cfgKey('downloadsNotified'), [])
    blocksNotifiedState.value = storage.read<number[]>(cfgKey('blocksNotified'), [])
  }

  function init(): void {
    if (loaded) return
    loaded = true
    loadMarks()
    loadLocalToMemory()
  }

  function readSlot(slot: StatSlot): CountItem[] {
    const data = slots[slot]
    if (data.length > 0) return data
    const items = buildDefaultCounts()
    slots[slot] = items
    syncSlot(slot)
    return items
  }

  function getCount(slot: StatSlot, id: number): number {
    const item = slots[slot].find((entry) => entry.id === id)
    return item ? item.count : 0
  }

  function incrementCount(slot: StatSlot, id: number, delta = 1): number {
    const data = slots[slot]
    const item = data.find((entry) => entry.id === id)
    if (item) {
      item.count = Math.max(0, item.count + delta)
      syncSlot(slot)
      return item.count
    }
    const next = Math.max(0, delta)
    data.push({ id, count: next })
    syncSlot(slot)
    return next
  }

  function snapshotLocal(): Record<StatSlot, Map<number, number>> {
    const snapshot = {} as Record<StatSlot, Map<number, number>>
    for (const slot of STAT_SLOTS) {
      const map = new Map<number, number>()
      ;(slots[slot] || []).forEach((item) => map.set(item.id, item.count))
      snapshot[slot] = map
    }
    return snapshot
  }

  function mergeWithLocal(serverArr: CountItem[], slot: StatSlot, snapshot: Record<StatSlot, Map<number, number>>): CountItem[] {
    const local = snapshot[slot]
    const merged: CountItem[] = serverArr.map((item) => {
      const localCount = local.get(item.id) || 0
      return { id: item.id, count: Math.max(item.count, localCount) }
    })
    const serverIds = new Set(serverArr.map((item) => item.id))
    local.forEach((count, id) => {
      if (!serverIds.has(id) && count > 0) merged.push({ id, count })
    })
    return merged
  }

  async function fetchAllDataFromServer(): Promise<boolean> {
    init()
    if (!canRequestAPI()) return false
    const config = channel.config.value
    const api = createChannelApi(config.backend)
    try {
      const response = await api.post<ChannelDataPayload>({
        dbPath: config.dbPath || '',
        db: config.dbName,
        action: 'getData',
        min: config.mediaIdMin,
        max: config.mediaIdMax
      })
      if (!response || !Array.isArray(response.stats) || response.stats.length === 0) return false

      const statsData = response.stats
      const extraData = Array.isArray(response.extra) ? response.extra : []
      const labelsRaw = Array.isArray(response.labels) ? response.labels : []

      const labelsMap = new Map<number, string[]>()
      labelsRaw.forEach((item) => {
        labelsMap.set(item.id, Array.isArray(item.labels) ? item.labels : [])
      })
      const nextLabels: LabelRecord[] = []
      for (let id = config.mediaIdMin; id <= config.mediaIdMax; id++) {
        nextLabels.push({ id, labels: labelsMap.get(id) || [] })
      }
      labelsState.value = nextLabels

      const snapshot = snapshotLocal()

      slots.hot = quickSort(mergeWithLocal(statsData.map((item) => ({ id: item.id, count: item.views || 0 })), 'hot', snapshot), byCountDesc)
      slots.topliked = quickSort(mergeWithLocal(statsData.map((item) => ({ id: item.id, count: item.likes || 0 })), 'topliked', snapshot), byCountDesc)
      slots.featured = quickSort(mergeWithLocal(statsData.map((item) => ({ id: item.id, count: item.favorites || 0 })), 'featured', snapshot), byCountDesc)
      slots.downloads = quickSort(mergeWithLocal(extraData.map((item) => ({ id: item.id, count: item.downloads || 0 })), 'downloads', snapshot), byCountDesc)
      slots.shares = quickSort(mergeWithLocal(extraData.map((item) => ({ id: item.id, count: item.shares || 0 })), 'shares', snapshot), byCountDesc)
      slots.blocks = quickSort(mergeWithLocal(extraData.map((item) => ({ id: item.id, count: item.blocks || 0 })), 'blocks', snapshot), byCountDesc)

      await new Promise((resolve) => setTimeout(resolve, 0))

      lastFetchTimeState.value = Date.now()
      storage.write(cfgKey('lastFetchTime'), lastFetchTimeState.value)
      for (const slot of STAT_SLOTS) syncSlot(slot)
      syncLabels()
      return true
    } catch {
      return false
    }
  }

  function getCacheCycle(): number {
    return storage.read<number>('cacheCycle', DEFAULT_CACHE_CYCLE)
  }

  async function checkAndRefreshData(): Promise<boolean> {
    init()
    const lastFetch = lastFetchTimeState.value
    const cycle = getCacheCycle()
    const elapsed = Date.now() - lastFetch
    const hasLocal = lastFetch > 0
    if (hasLocal && elapsed < cycle) return false
    return await fetchAllDataFromServer()
  }

  function getLabelsForMedia(id: number): string[] {
    const item = labelsState.value.find((entry) => entry.id === id)
    return item ? item.labels : []
  }

  function getViewCooldowns(): Record<string, number> {
    return storage.read<Record<string, number>>(cfgKey('viewCooldowns'), {})
  }

  function setViewCooldown(id: number): void {
    const cooldowns = getViewCooldowns()
    const now = Date.now()
    for (const key of Object.keys(cooldowns)) {
      if (now - cooldowns[key] >= VIEW_COOLDOWN_MEDIA) delete cooldowns[key]
    }
    cooldowns[String(id)] = now
    storage.write(cfgKey('viewCooldowns'), cooldowns)
  }

  function isViewCooldown(id: number, cooldown: number): boolean {
    const cooldowns = getViewCooldowns()
    const stamp = cooldowns[String(id)]
    return Boolean(stamp) && Date.now() - stamp < cooldown
  }

  function notifyServer(action: string, id: number): void {
    if (!canRequestAPI()) return
    const config = channel.config.value
    const api = createChannelApi(config.backend)
    const statsActions = ['view', 'like', 'favorite']
    const table = statsActions.includes(action) ? 'stats' : 'extra'
    void api.post({
      dbPath: config.dbPath || '',
      db: config.dbName,
      table,
      action,
      id
    })
  }

  function recordView(id: number): number {
    setViewCooldown(id)
    notifyServer('view', id)
    return incrementCount('hot', id)
  }

  function isLiked(id: number): boolean {
    return likesState.value.includes(id)
  }

  function toggleLike(id: number): boolean {
    if (likesState.value.includes(id)) {
      likesState.value = likesState.value.filter((entry) => entry !== id)
      storage.write(cfgKey('likes'), likesState.value)
      return false
    }
    likesState.value = [...likesState.value, id]
    storage.write(cfgKey('likes'), likesState.value)
    return true
  }

  function removeLike(id: number): void {
    likesState.value = likesState.value.filter((entry) => entry !== id)
    storage.write(cfgKey('likes'), likesState.value)
  }

  function isLikeNotified(id: number): boolean {
    return likesNotifiedState.value.includes(id)
  }

  function markLikeNotified(id: number): void {
    if (likesNotifiedState.value.includes(id)) return
    likesNotifiedState.value = [...likesNotifiedState.value, id]
    storage.write(cfgKey('likesNotified'), likesNotifiedState.value)
  }

  function isFavorited(id: number): boolean {
    return favoritesState.value.includes(id)
  }

  function getFavorites(): number[] {
    return favoritesState.value.slice()
  }

  function toggleFavorite(id: number): boolean {
    if (favoritesState.value.includes(id)) {
      favoritesState.value = favoritesState.value.filter((entry) => entry !== id)
      storage.write(cfgKey('favorites'), favoritesState.value)
      return false
    }
    favoritesState.value = [id, ...favoritesState.value]
    storage.write(cfgKey('favorites'), favoritesState.value)
    return true
  }

  function removeFavorite(id: number): void {
    favoritesState.value = favoritesState.value.filter((entry) => entry !== id)
    storage.write(cfgKey('favorites'), favoritesState.value)
  }

  function isFavNotified(id: number): boolean {
    return favsNotifiedState.value.includes(id)
  }

  function markFavNotified(id: number): void {
    if (favsNotifiedState.value.includes(id)) return
    favsNotifiedState.value = [...favsNotifiedState.value, id]
    storage.write(cfgKey('favsNotified'), favsNotifiedState.value)
  }

  function isBlocked(id: number): boolean {
    return blocksState.value.includes(id)
  }

  function blockMedia(id: number): void {
    if (blocksState.value.includes(id)) return
    blocksState.value = [...blocksState.value, id]
    storage.write(cfgKey('blocks'), blocksState.value)
  }

  function unblockMedia(id: number): void {
    blocksState.value = blocksState.value.filter((entry) => entry !== id)
    storage.write(cfgKey('blocks'), blocksState.value)
  }

  function isBlockNotified(id: number): boolean {
    return blocksNotifiedState.value.includes(id)
  }

  function markBlockNotified(id: number): void {
    if (blocksNotifiedState.value.includes(id)) return
    blocksNotifiedState.value = [...blocksNotifiedState.value, id]
    storage.write(cfgKey('blocksNotified'), blocksNotifiedState.value)
  }

  function isShareNotified(id: number): boolean {
    return sharesNotifiedState.value.includes(id)
  }

  function markShareNotified(id: number): void {
    if (sharesNotifiedState.value.includes(id)) return
    sharesNotifiedState.value = [...sharesNotifiedState.value, id]
    storage.write(cfgKey('sharesNotified'), sharesNotifiedState.value)
  }

  function isDownloadNotified(id: number): boolean {
    return downloadsNotifiedState.value.includes(id)
  }

  function markDownloadNotified(id: number): void {
    if (downloadsNotifiedState.value.includes(id)) return
    downloadsNotifiedState.value = [...downloadsNotifiedState.value, id]
    storage.write(cfgKey('downloadsNotified'), downloadsNotifiedState.value)
  }

  return {
    slots,
    labels: labelsState,
    lastFetchTime: lastFetchTimeState,
    init,
    syncSlot,
    readSlot,
    getCount,
    incrementCount,
    fetchAllDataFromServer,
    checkAndRefreshData,
    getCacheCycle,
    getLabelsForMedia,
    recordView,
    isViewCooldown,
    isLiked,
    toggleLike,
    removeLike,
    isLikeNotified,
    markLikeNotified,
    isFavorited,
    toggleFavorite,
    removeFavorite,
    getFavorites,
    isFavNotified,
    markFavNotified,
    isBlocked,
    blockMedia,
    unblockMedia,
    isBlockNotified,
    markBlockNotified,
    isShareNotified,
    markShareNotified,
    isDownloadNotified,
    markDownloadNotified,
    notifyServer
  }
}
