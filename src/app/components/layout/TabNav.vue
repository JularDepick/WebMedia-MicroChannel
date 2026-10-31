<template>
  <nav id="tabNav" ref="navEl" class="tab-nav" :class="{ 'nav-hidden': hidden }">
    <div class="nav-left" ref="navLeftEl">
      <div id="channelSwitch" class="channel-switch" ref="channelSwitchEl">
        <span v-if="channels.length === 0" class="channel-placeholder">无频道</span>
        <DropdownMenu
          v-else
          :items="channelItems"
          :model-value="channelIndex"
          mode="click"
          @change="onChannelChange"
          @open="emit('channel-open')"
        />
      </div>
      <div class="tab-group align-center" ref="tabGroupEl">
        <button
          v-for="tab in TABS"
          :key="tab.key"
          :ref="(el) => setTabRef(el, tab.key)"
          class="tab-btn"
          :class="{ active: currentTab === tab.key, 'tab-pressed': pressedTab === tab.key }"
          :data-tab="tab.key"
          @mousedown="pressedTab = tab.key"
          @mouseup="pressedTab = ''"
          @mouseleave="pressedTab = ''"
          @click="onTabClick(tab.key)"
        >{{ tab.label }}</button>
        <DropdownMenu
          ref="moreDropRef"
          :items="moreItems"
          :label="moreLabel"
          :model-value="moreTabKey"
          mode="longpress"
          :long-press-ms="300"
          long-press-trigger="immediate"
          indicator="none"
          wrapper-cls="tab-more-wrap"
          trigger-cls="tab-more-btn"
          dropdown-cls="tab-more-dropdown"
          option-cls="tab-more-option"
          :extra-trigger-class="moreActive ? 'active' : ''"
          @trigger-click="onMoreClick"
          @change="onMoreSelect"
        />
      </div>
    </div>
    <button id="settingsToggle" class="settings-toggle" title="设置" @click="emit('toggle-settings')">&#9881;</button>
  </nav>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { TabKey } from '~~/shared/types/channel'
import DropdownMenu from '~/components/ui/DropdownMenu.vue'

interface TabDefinition {
  key: TabKey
  label: string
}

/* Tab 顺序, 与原始导航一致 */
const TABS: TabDefinition[] = [
  { key: 'favorites', label: '收藏' },
  { key: 'labeled', label: '标签' },
  { key: 'explore', label: '探索' },
  { key: 'home', label: '首页' },
  { key: 'recommend', label: '推荐' },
  { key: 'hot', label: '热门' },
  { key: 'topliked', label: '高赞' },
  { key: 'featured', label: '精选' },
  { key: 'best', label: '优质' },
  { key: 'shared', label: '乐享' },
  { key: 'sensitive', label: '敏感' }
]

/* 双击判定窗口(ms) */
const DOUBLE_CLICK = 300
/* 向下滚动收起阈值(px) */
const HIDE_THRESHOLD = 80
/* 向上滚动展开阈值(px) */
const REVEAL_THRESHOLD = 15
/* 距顶部强制展开阈值(px) */
const TOP_SAFE = 10

const props = defineProps<{
  currentTab: TabKey
  channelIndex: number
  channels: Array<{ name: string }>
}>()

const emit = defineEmits<{
  (event: 'switch', tab: TabKey, isDoubleClick: boolean): void
  (event: 'channel-change', index: number): void
  (event: 'channel-open'): void
  (event: 'toggle-settings'): void
}>()

const navEl = ref<HTMLElement | null>(null)
const navLeftEl = ref<HTMLElement | null>(null)
const tabGroupEl = ref<HTMLElement | null>(null)
const channelSwitchEl = ref<HTMLElement | null>(null)
interface DropdownExposed {
  open: () => void
  close: () => void
  isOpen: boolean
  getWrapElement: () => HTMLElement | null
}

const moreDropRef = ref<DropdownExposed | null>(null)

const tabElements = new Map<string, HTMLElement>()
const lastClickMap = new Map<string, number>()

const pressedTab = ref('')
const hidden = ref(false)
const hasOverflow = ref(false)
const moreTabKey = ref<TabKey>('favorites')
const moreLabel = ref('')
const moreItems = ref<Array<{ text: string; value: string }>>([])

const channelItems = computed(() => props.channels.map((item, index) => ({ text: item.name, value: index })))
const moreActive = computed(() => hasOverflow.value && props.currentTab === moreTabKey.value)

let lastOverflowSig = ''
let ticking = false
let lastScrollY = 0
let hideAccum = 0
let navLeftObserver: ResizeObserver | null = null
let resizeTimer: ReturnType<typeof setTimeout> | null = null

function setTabRef(el: unknown, key: string): void {
  if (el instanceof HTMLElement) tabElements.set(key, el)
  else tabElements.delete(key)
}

function moreWrapElement(): HTMLElement | null {
  return moreDropRef.value ? moreDropRef.value.getWrapElement() : null
}

function onTabClick(tab: TabKey): void {
  const now = Date.now()
  const last = lastClickMap.get(tab) || 0
  if (props.currentTab === tab && now - last < DOUBLE_CLICK) {
    lastClickMap.set(tab, 0)
    emit('switch', tab, true)
    return
  }
  lastClickMap.set(tab, now)
  emit('switch', tab, false)
}

function onMoreClick(): void {
  const tab = moreTabKey.value
  if (!tab) return
  const now = Date.now()
  const last = lastClickMap.get(tab) || 0
  if (props.currentTab === tab && now - last < DOUBLE_CLICK) {
    lastClickMap.set(tab, 0)
    emit('switch', tab, true)
    return
  }
  lastClickMap.set(tab, now)
  emit('switch', tab, false)
}

function onMoreSelect(value: string | number): void {
  const tab = String(value) as TabKey
  if (!tab) return
  emit('switch', tab, false)
}

function onChannelChange(value: string | number): void {
  emit('channel-change', Number(value))
}

function closeMore(): void {
  if (moreDropRef.value) moreDropRef.value.close()
}

/* 溢出重算: 全部显示后按容器宽度收回溢出项 */
function recalcOverflow(): void {
  const tabGroup = tabGroupEl.value
  const navLeft = navLeftEl.value
  const moreWrap = moreWrapElement()
  if (!tabGroup || !navLeft || !moreWrap) return

  const buttons = TABS.map((tab) => tabElements.get(tab.key)).filter((el): el is HTMLElement => Boolean(el))
  if (buttons.length === 0) return

  buttons.forEach((btn) => {
    btn.style.display = ''
  })
  moreWrap.style.display = 'none'
  closeMore()

  const channelWidth = channelSwitchEl.value ? channelSwitchEl.value.offsetWidth : 0
  const navLeftWidth = navLeft.offsetWidth
  const navLeftGap = Number.parseFloat(getComputedStyle(navLeft).gap) || 0
  const containerWidth = navLeftWidth - channelWidth - (channelWidth > 0 ? navLeftGap : 0)

  const buttonGap = 4
  let totalWidth = 0
  buttons.forEach((btn, index) => {
    totalWidth += btn.offsetWidth + (index > 0 ? buttonGap : 0)
  })

  const signature = Math.round(containerWidth) + '|' + buttons.length
  if (signature === lastOverflowSig && !hasOverflow.value) return
  lastOverflowSig = signature

  if (totalWidth <= containerWidth) {
    hasOverflow.value = false
    moreLabel.value = ''
    moreItems.value = []
    return
  }

  /* 更多按钮与 Tab 按钮同样式, 其宽度取最长标题对应的按钮宽度 */
  let moreWidth = 0
  buttons.forEach((btn) => {
    if (btn.offsetWidth > moreWidth) moreWidth = btn.offsetWidth
  })

  let accumulated = 0
  let firstOverflowIdx = buttons.length
  for (let i = 0; i < buttons.length; i++) {
    const width = buttons[i].offsetWidth
    if (accumulated + width + moreWidth > containerWidth) {
      firstOverflowIdx = i
      break
    }
    accumulated += width + buttonGap
  }

  if (firstOverflowIdx >= buttons.length) {
    hasOverflow.value = false
    moreLabel.value = ''
    moreItems.value = []
    return
  }
  if (firstOverflowIdx === 0) firstOverflowIdx = 1
  hasOverflow.value = true

  const overflowTabs = TABS.slice(firstOverflowIdx)
  overflowTabs.forEach((tab) => {
    const btn = tabElements.get(tab.key)
    if (btn) btn.style.display = 'none'
  })
  moreWrap.style.display = ''

  const active = overflowTabs.find((tab) => tab.key === props.currentTab) || overflowTabs[0]
  moreTabKey.value = active.key
  moreLabel.value = active.label
  moreItems.value = overflowTabs
    .filter((tab) => tab.key !== active.key)
    .map((tab) => ({ text: tab.label, value: tab.key }))
}

function onWindowScroll(): void {
  if (ticking) return
  ticking = true
  requestAnimationFrame(updateNavVisibility)
}

function updateNavVisibility(): void {
  ticking = false
  const currentY = window.scrollY
  const delta = currentY - lastScrollY
  lastScrollY = currentY

  if (currentY <= TOP_SAFE) {
    hidden.value = false
    hideAccum = 0
    return
  }

  if (delta > 0) {
    hideAccum += delta
    if (hideAccum > HIDE_THRESHOLD && !hidden.value) hidden.value = true
  } else if (delta < 0) {
    hideAccum = 0
    if (delta < -REVEAL_THRESHOLD && hidden.value) hidden.value = false
  }
}

watch(
  () => props.currentTab,
  () => {
    void nextTick(() => recalcOverflow())
  }
)

onMounted(() => {
  lastScrollY = window.scrollY
  window.addEventListener('scroll', onWindowScroll, { passive: true })

  const navLeft = navLeftEl.value
  if (navLeft && typeof ResizeObserver !== 'undefined') {
    navLeftObserver = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => recalcOverflow(), 100)
    })
    navLeftObserver.observe(navLeft)
  }

  void nextTick(() => recalcOverflow())

  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    void document.fonts.ready.then(() => recalcOverflow())
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onWindowScroll)
  if (navLeftObserver) {
    navLeftObserver.disconnect()
    navLeftObserver = null
  }
  if (resizeTimer) clearTimeout(resizeTimer)
})

function getHeight(): number {
  return navEl.value ? navEl.value.offsetHeight : 0
}

defineExpose({ recalcOverflow, closeMore, getHeight })
</script>
