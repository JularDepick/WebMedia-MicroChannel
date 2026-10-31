<template>
  <div class="page-root">
    <Sidebar
      :collapsed="sidebarCollapsed"
      :enabled="sidebarEnabled"
      :current-tab="currentTab"
      :nav-height="navHeight"
      @update:collapsed="sidebarCollapsed = $event"
    />

    <button
      id="btnBackTop"
      class="back-to-top"
      :class="{ visible: backTopVisible }"
      title="回到顶部"
      @click="scrollToTop"
    >&#9650;</button>

    <main id="mainContent" class="main-content">
      <TabNav
        ref="tabNavRef"
        :current-tab="currentTab"
        :channel-index="channel.channelIndex.value"
        :channels="channel.channels"
        @switch="switchTab"
        @channel-change="onChannelChange"
        @channel-open="onChannelOpen"
        @toggle-settings="toggleSettings"
      />

      <div id="navSpacer" class="nav-spacer"></div>

      <InfoBars :announcement="announcement" :description="description" />

      <LabelFilterBar
        :labels="labelFilter"
        :mode="labelFilterMode"
        :visible="currentTab === 'labeled'"
        @change="onLabelFilterChange"
      />

      <MediaGrid :tab="currentTab" @remove="onCardRemove" />

      <footer class="author-footer">
        <span>{{ author.project }}</span>
        <a :href="author.projectUrl" target="_blank" rel="noopener">{{ author.name }}</a>
      </footer>
    </main>

    <FullscreenViewer />
    <SettingsPanel :open="settingsOpen" @update:open="settingsOpen = $event" @force-refresh="onForceRefresh" />
    <ToastView />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { TabKey } from '~~/shared/types/channel'
import {
  AUTHOR_INFO,
  ENABLE_FIRST_VISIT_GUIDE,
  GUIDE_ANNOUNCEMENT,
  PAGE_TITLE
} from '~~/shared/constants/site'
import FullscreenViewer from '~/components/media/FullscreenViewer.vue'
import MediaGrid from '~/components/media/MediaGrid.vue'
import InfoBars from '~/components/layout/InfoBars.vue'
import LabelFilterBar from '~/components/layout/LabelFilterBar.vue'
import SettingsPanel from '~/components/layout/SettingsPanel.vue'
import Sidebar from '~/components/layout/Sidebar.vue'
import TabNav from '~/components/layout/TabNav.vue'
import ToastView from '~/components/ui/ToastView.vue'
import { useBookmarks } from '~/composables/useBookmarks'
import { useChannel } from '~/composables/useChannel'
import { useDeviceEnv } from '~/composables/useDeviceEnv'
import { useMediaLayout } from '~/composables/useMediaLayout'
import { useSettings, REFRESH_COOLDOWN } from '~/composables/useSettings'
import { quickSort, useStats } from '~/composables/useStats'
import { useStorage } from '~/composables/useStorage'
import { useTheme } from '~/composables/useTheme'
import { useToast } from '~/composables/useToast'

/* 标签筛选模式 */
type LabelFilterMode = 'exact' | 'partial'

/* 各 Tab 的说明文案 */
const TAB_DESCRIPTIONS: Record<string, string> = {
  favorites: '查看你收藏的资源',
  explore: '随机发现资源，每次都有新惊喜',
  home: '按编号顺序浏览全部资源',
  recommend: '综合权值推荐: (浏览+点赞×2+收藏×3+下载×3+分享×2-屏蔽×5)/15',
  hot: '按浏览量降序排序',
  topliked: '按点赞量降序排序',
  featured: '按收藏量降序排序',
  best: '按下载量降序排序',
  shared: '按分享量降序排序',
  sensitive: '按屏蔽量降序排序',
  labeled: '按标签筛选媒体，多个标签取交集'
}

/* 频道未配置公告时的兜底文案 */
const FALLBACK_ANNOUNCEMENT = '欢迎访问在线媒体微频道，海量高清资源等你探索！'
/* 推荐公式权重 */
const SCORE_DIVISOR = 15
/* 首次访问提示延时(ms) */
const GUIDE_DELAY = 1000
/* Alt+滚轮滚动倍率 */
const ALT_WHEEL_SCALE = 2.5

interface TabNavExposed {
  recalcOverflow: () => void
  closeMore: () => void
  getHeight: () => number
}

const storage = useStorage()
const channel = useChannel()
const device = useDeviceEnv()
const theme = useTheme()
const settings = useSettings()
const stats = useStats()
const bookmarks = useBookmarks()
const layout = useMediaLayout()
const { showToast } = useToast()

const tabNavRef = ref<TabNavExposed | null>(null)
const currentTab = ref<TabKey>('home')
const labelFilter = ref<string[]>([])
const labelFilterMode = ref<LabelFilterMode>('exact')
const sidebarCollapsed = ref(true)
const settingsOpen = ref(false)
const navHeight = ref(52)
const backTopVisible = ref(false)

/* 探索页已使用编号 */
let exploreUsed = new Set<number>()
/* 初始化完成标记 */
let ready = false

const author = AUTHOR_INFO
const announcement = computed(() => channel.config.value.announcement || FALLBACK_ANNOUNCEMENT)
const description = computed(() => TAB_DESCRIPTIONS[currentTab.value] || '')
const sidebarEnabled = computed(() => bookmarks.isEnabled(currentTab.value))

useHead({
  title: computed(() => channel.config.value.nickname || PAGE_TITLE),
  link: computed(() => {
    const icon = channel.config.value.iconSrc
    return [{ rel: 'icon', href: icon || '/favicon.ico', type: 'image/x-icon' }]
  })
})

watch(
  () => settings.showLabelBanner.value,
  (value) => {
    if (typeof document === 'undefined') return
    document.body.classList.toggle('hide-label-banner', !value)
  },
  { immediate: true }
)

watch(
  () => settings.colCount.value,
  () => {
    if (!ready) return
    layout.rebuild(currentTab.value)
  }
)

watch(
  () => settings.mediaRatio.value,
  () => {
    if (!ready) return
    layout.rebuild(currentTab.value)
  }
)

/* 计分公式 */
function scoreOf(id: number, viewMap: Record<number, number>, likeMap: Record<number, number>, favMap: Record<number, number>, dlMap: Record<number, number>, shareMap: Record<number, number>, blockMap: Record<number, number>): number {
  const views = viewMap[id] || 0
  const likes = likeMap[id] || 0
  const favorites = favMap[id] || 0
  const downloads = dlMap[id] || 0
  const shares = shareMap[id] || 0
  const blocks = blockMap[id] || 0
  return (views + likes * 2 + favorites * 3 + downloads * 3 + shares * 2 - blocks * 5) / SCORE_DIVISOR
}

function buildMaps(): {
  viewMap: Record<number, number>
  likeMap: Record<number, number>
  favMap: Record<number, number>
  dlMap: Record<number, number>
  shareMap: Record<number, number>
  blockMap: Record<number, number>
} {
  const viewMap: Record<number, number> = {}
  const likeMap: Record<number, number> = {}
  const favMap: Record<number, number> = {}
  const dlMap: Record<number, number> = {}
  const shareMap: Record<number, number> = {}
  const blockMap: Record<number, number> = {}
  stats.readSlot('hot').forEach((item) => {
    viewMap[item.id] = item.count
  })
  stats.readSlot('topliked').forEach((item) => {
    likeMap[item.id] = item.count
  })
  stats.readSlot('featured').forEach((item) => {
    favMap[item.id] = item.count
  })
  stats.readSlot('downloads').forEach((item) => {
    dlMap[item.id] = item.count
  })
  stats.readSlot('shares').forEach((item) => {
    shareMap[item.id] = item.count
  })
  stats.readSlot('blocks').forEach((item) => {
    blockMap[item.id] = item.count
  })
  return { viewMap, likeMap, favMap, dlMap, shareMap, blockMap }
}

/* 生成当前 Tab 的完整编号序列 */
function generateSortedIds(tab: TabKey): number[] {
  const config = channel.config.value
  const allIds: number[] = []
  for (let id = config.mediaIdMin; id <= config.mediaIdMax; id++) allIds.push(id)

  if (tab === 'home') {
    return allIds.filter((id) => !stats.isBlocked(id))
  }

  if (tab === 'explore') {
    const result: number[] = []
    let attempts = 0
    const total = allIds.length
    while (result.length < total && attempts < total * 3) {
      attempts += 1
      const id = Math.floor(Math.random() * total) + config.mediaIdMin
      if (!exploreUsed.has(id)) {
        exploreUsed.add(id)
        result.push(id)
      }
    }
    return result
  }

  if (tab === 'favorites') {
    return stats.getFavorites().filter((id) => !stats.isBlocked(id))
  }

  if (tab === 'recommend') {
    const { viewMap, likeMap, favMap, dlMap, shareMap, blockMap } = buildMaps()
    const scored = allIds.map((id) => ({
      id,
      score: Number(scoreOf(id, viewMap, likeMap, favMap, dlMap, shareMap, blockMap).toFixed(2))
    }))
    scored.sort((a, b) => (b.score !== a.score ? b.score - a.score : a.id - b.id))
    return scored.filter((item) => !stats.isBlocked(item.id)).map((item) => item.id)
  }

  if (tab === 'labeled') {
    let filtered = allIds
    if (labelFilter.value.length > 0) {
      const labels = labelFilter.value
      const mode = labelFilterMode.value
      filtered = allIds.filter((id) => {
        const tags = stats.getLabelsForMedia(id)
        if (tags.length === 0) return false
        return labels.every((label) => {
          if (mode === 'partial') return tags.some((tag) => tag.indexOf(label) !== -1)
          return tags.indexOf(label) !== -1
        })
      })
    }
    const { viewMap, likeMap, favMap, dlMap, shareMap, blockMap } = buildMaps()
    filtered.sort((a, b) => {
      const scoreA = scoreOf(a, viewMap, likeMap, favMap, dlMap, shareMap, blockMap)
      const scoreB = scoreOf(b, viewMap, likeMap, favMap, dlMap, shareMap, blockMap)
      return scoreB !== scoreA ? scoreB - scoreA : a - b
    })
    return filtered.filter((id) => !stats.isBlocked(id))
  }

  const slotMap: Record<string, 'hot' | 'topliked' | 'featured' | 'downloads' | 'shares' | 'blocks'> = {
    hot: 'hot',
    topliked: 'topliked',
    featured: 'featured',
    best: 'downloads',
    shared: 'shares',
    sensitive: 'blocks'
  }
  const slot = slotMap[tab]
  if (!slot) return []
  const includeBlocked = tab === 'sensitive'
  const data = quickSort(stats.readSlot(slot).slice(), (a, b) => (b.count !== a.count ? b.count - a.count : a.id - b.id))
  return includeBlocked ? data.map((item) => item.id) : data.filter((item) => !stats.isBlocked(item.id)).map((item) => item.id)
}

/* 按当前 Tab 的规则重排已加载顺序 */
function sortExisting(tab: TabKey, order: number[]): number[] {
  if (tab === 'home') return order.slice().sort((a, b) => a - b)
  if (tab === 'explore') return order.slice()
  if (tab === 'favorites') {
    const favorites = stats.getFavorites()
    return favorites.filter((id) => order.indexOf(id) !== -1)
  }
  if (tab === 'recommend' || tab === 'labeled') {
    const { viewMap, likeMap, favMap, dlMap, shareMap, blockMap } = buildMaps()
    return order
      .slice()
      .sort((a, b) => {
        const scoreA = scoreOf(a, viewMap, likeMap, favMap, dlMap, shareMap, blockMap)
        const scoreB = scoreOf(b, viewMap, likeMap, favMap, dlMap, shareMap, blockMap)
        return scoreB !== scoreA ? scoreB - scoreA : a - b
      })
  }
  const slotMap: Record<string, 'hot' | 'topliked' | 'featured' | 'downloads' | 'shares' | 'blocks'> = {
    hot: 'hot',
    topliked: 'topliked',
    featured: 'featured',
    best: 'downloads',
    shared: 'shares',
    sensitive: 'blocks'
  }
  const slot = slotMap[tab]
  if (!slot) return order.slice()
  const countMap: Record<number, number> = {}
  stats.readSlot(slot).forEach((item) => {
    countMap[item.id] = item.count
  })
  return order.slice().sort((a, b) => {
    const countA = countMap[a] || 0
    const countB = countMap[b] || 0
    return countB !== countA ? countB - countA : a - b
  })
}

function loadNextPage(): void {
  layout.loadNextPage(currentTab.value)
}

function resetAndLoad(resetExplore = true): void {
  if (resetExplore && currentTab.value === 'explore') exploreUsed = new Set<number>()
  const ids = generateSortedIds(currentTab.value)
  layout.resetAndLoad(currentTab.value, ids, resetExplore)
}

function restoreTabCards(tab: TabKey): boolean {
  const order = layout.getOrder(tab)
  if (order.length === 0) return false
  const sorted = sortExisting(tab, order)
  const renderIds = tab === 'sensitive' ? sorted : sorted.filter((id) => !stats.isBlocked(id))
  layout.restore(tab, renderIds, () => generateSortedIds(tab))
  return true
}

function applyTab(tab: TabKey): void {
  currentTab.value = tab
  storage.write('currentTab', tab)
  bookmarks.setTab(tab)
  layout.setScrollPaused(true)
  window.scrollTo(0, 0)
  if (!restoreTabCards(tab)) resetAndLoad()
  bookmarks.collapseAll()
}

function switchTab(tab: TabKey, isDoubleClick = false): void {
  if (!isDoubleClick && tab === currentTab.value) {
    window.scrollTo(0, 0)
    return
  }
  layout.cancelRebalance()
  layout.setScrollPaused(false)

  if (isDoubleClick) {
    currentTab.value = tab
    storage.write('currentTab', tab)
    bookmarks.setTab(tab)
    window.scrollTo(0, 0)
    if (tab === 'explore') resetAndLoad(true)
    else restoreTabCards(tab)
    return
  }

  applyTab(tab)
}

function onChannelChange(index: number): void {
  channel.switchChannel(index)
}

function onChannelOpen(): void {
  sidebarCollapsed.value = true
  bookmarks.collapseAll()
}

function toggleSettings(): void {
  settingsOpen.value = !settingsOpen.value
}

function scrollToTop(): void {
  window.scrollTo(0, 0)
}

function onCardRemove(id: number): void {
  layout.removeCard(currentTab.value, id)
}

function onLabelFilterChange(payload: { labels: string[]; mode: LabelFilterMode }): void {
  labelFilter.value = payload.labels
  labelFilterMode.value = payload.mode
  if (currentTab.value === 'labeled') resetAndLoad(false)
}

async function onForceRefresh(): Promise<void> {
  if (settings.refreshDisabled.value) return
  settings.beginRefresh()
  const success = await stats.fetchAllDataFromServer()
  settings.endRefresh()
  if (success) {
    settings.startRefreshCountdown(Date.now() + REFRESH_COOLDOWN)
    resetAndLoad(false)
    showToast('数据更新成功')
    return
  }
  showToast('数据更新失败，请重试')
}

function updateNavHeight(): void {
  const height = tabNavRef.value ? tabNavRef.value.getHeight() : 0
  if (height > 0) navHeight.value = height
}

function onWindowScroll(): void {
  backTopVisible.value = window.scrollY > window.innerHeight
  if (layout.scrollPaused.value) layout.setScrollPaused(false)
}

function onWheelKeyScroll(event: WheelEvent): void {
  if (!event.altKey) return
  event.preventDefault()
  window.scrollBy(0, event.deltaY * ALT_WHEEL_SCALE)
}

function checkFirstVisit(): void {
  if (!ENABLE_FIRST_VISIT_GUIDE) return
  if (localStorage.getItem('visited') === 'true') return
  setTimeout(() => {
    showToast(GUIDE_ANNOUNCEMENT, 5000)
  }, GUIDE_DELAY)
  localStorage.setItem('visited', 'true')
}

onMounted(async () => {
  channel.init()
  theme.init()
  settings.applyChannelOverrides(channel.config.value)
  theme.refreshTheme()
  stats.init()
  bookmarks.setTab(currentTab.value)

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
  window.scrollTo(0, 0)

  layout.setLoader(loadNextPage)
  layout.bindWindow()
  layout.setScrollPaused(false)

  updateNavHeight()
  checkFirstVisit()

  window.addEventListener('scroll', onWindowScroll, { passive: true })
  window.addEventListener('wheel', onWheelKeyScroll, { passive: false })

  device.subscribe(() => {
    settings.setColCount(Math.min(settings.colCount.value, settings.maxColumns.value))
    layout.rebuild(currentTab.value)
    tabNavRef.value?.recalcOverflow()
    tabNavRef.value?.closeMore()
    updateNavHeight()
  })

  const savedTab = storage.read<TabKey>('currentTab', 'home')
  ready = true
  applyTab(savedTab)
  backTopVisible.value = window.scrollY > window.innerHeight

  const refreshed = await stats.checkAndRefreshData()
  if (refreshed) resetAndLoad(false)
  layout.applyColumnWidths()
  tabNavRef.value?.recalcOverflow()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onWindowScroll)
  window.removeEventListener('wheel', onWheelKeyScroll)
  layout.setLoader(null)
  layout.unbindWindow()
  settings.stopRefreshCountdown()
  if (typeof document !== 'undefined') document.body.classList.remove('hide-label-banner')
})
</script>

<style src="~/assets/css/main.css"></style>

<style scoped>
/* 页脚作者信息: 低调, 无装饰 */
.author-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  padding: 24px 16px 40px;
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-muted);
}

.author-footer a {
  color: var(--text-muted);
  text-decoration: none;
}

.author-footer a:hover {
  color: var(--text-secondary);
}
</style>
