/* ============================================================
   瀑布流布局
   列容器构建、卡片分配、列高跟踪与底部再平衡、sentinel 无限滚动
   ============================================================ */

import { computed, nextTick, ref, type ComputedRef, type Ref } from 'vue'
import { computeFixedColumnWidth, readGridGap } from '../utils/layout'
import { useChannel } from './useChannel'
import { ROWS_PER_PAGE, useSettings } from './useSettings'

/* 底部判定阈值(px) */
const BOTTOM_THRESHOLD = 150
/* 再平衡停止阈值(px) */
const REBALANCE_STOP_GAP = 300
/* 可见卡片判定余量(px) */
const VISIBLE_MARGIN = 200

export interface LayoutDeps {
  /* 网格容器 */
  getContainer: () => HTMLElement | null
  /* 列容器, 按列序 */
  getColumns: () => HTMLElement[]
  /* 卡片元素 */
  getCardElement: (id: number) => HTMLElement | null
}

/* 列容器中的卡片编号 */
const columns = ref<number[][]>([])
/* 当前 Tab 的完整编号序列 */
const sortedIds = ref<number[]>([])
/* 已加载页码 */
const currentPage = ref(0)
/* 是否正在加载一页 */
const loadingPage = ref(false)
/* 快速滚动时暂停加载 */
const scrollPaused = ref(false)
/* 单列宽度 */
const columnWidth = ref(0)
/* 是否停在页面底部 */
const atBottom = ref(false)

/* 各 Tab 已加载的编号顺序 */
const tabOrders = new Map<string, number[]>()
/* 再平衡重入标记 */
let rebalancing = false
let rafId = 0
let lastScrollY = 0
let deps: LayoutDeps | null = null
let loader: (() => void) | null = null
let sentinelEl: HTMLElement | null = null
let sentinelObserver: IntersectionObserver | null = null
let windowBound = false

export interface MediaLayoutContext {
  columns: Ref<number[][]>
  sortedIds: Ref<number[]>
  currentPage: Ref<number>
  loadingPage: Ref<boolean>
  scrollPaused: Ref<boolean>
  columnWidth: Ref<number>
  atBottom: Ref<boolean>
  cardsPerPage: ComputedRef<number>
  noMore: ComputedRef<boolean>
  /* 绑定 DOM 访问入口 */
  attach: (value: LayoutDeps) => void
  detach: () => void
  /* 设置加载下一页的回调 */
  setLoader: (fn: (() => void) | null) => void
  /* 卡片元素 */
  getCardElement: (id: number) => HTMLElement | null
  /* 计算并应用列宽 */
  applyColumnWidths: () => void
  /* 构建空列容器 */
  createColumns: (count: number) => void
  /* 顺序创建列并读入宽度 */
  buildColumns: (count: number, container: HTMLElement | null) => void
  /* 重置并加载 */
  resetAndLoad: (tab: string, ids: number[], resetExplore: boolean) => void
  /* 从已有顺序恢复 */
  restore: (tab: string, ids: number[], nextIds: () => number[]) => void
  /* 重建列容器(不重载内容) */
  rebuild: (tab: string) => void
  /* 加载下一页 */
  loadNextPage: (tab: string) => void
  /* 表格内已加载顺序 */
  getOrder: (tab: string) => number[]
  setOrder: (tab: string, ids: number[]) => void
  hasOrder: (tab: string) => boolean
  /* 移除卡片 */
  removeCard: (tab: string, id: number) => void
  /* 高度上报 */
  markPlaceholder: (id: number) => void
  markHeightReady: (id: number) => void
  resetHeightFlag: (id: number) => void
  /* 再平衡 */
  startRebalance: () => void
  cancelRebalance: () => void
  /* 无限滚动 */
  attachSentinel: (el: HTMLElement | null) => void
  refreshSentinel: () => void
  /* 窗口滚动监听 */
  bindWindow: () => void
  unbindWindow: () => void
  /* 滚动恢复加载 */
  setScrollPaused: (value: boolean) => void
}

/* 页面级单例, 保证卡片组件与页面共享同一份布局状态 */
let cachedContext: MediaLayoutContext | null = null

export function useMediaLayout(): MediaLayoutContext {
  if (cachedContext) return cachedContext
  const channel = useChannel()
  const settings = useSettings()

  const cardsPerPage = computed(() => ROWS_PER_PAGE * settings.colCount.value)
  const noMore = computed(() => sortedIds.value.length > 0 && currentPage.value * cardsPerPage.value >= sortedIds.value.length)

  function attach(value: LayoutDeps): void {
    deps = value
  }

  function detach(): void {
    deps = null
  }

  function setLoader(fn: (() => void) | null): void {
    loader = fn
  }

  function getCardElement(id: number): HTMLElement | null {
    if (deps?.getCardElement) {
      const el = deps.getCardElement(id)
      if (el) return el
    }
    const container = deps ? deps.getContainer() : null
    if (!container) return null
    return container.querySelector<HTMLElement>('.media-card[data-id="' + id + '"]')
  }

  function applyColumnWidths(): void {
    const container = deps ? deps.getContainer() : null
    if (!container) return
    const width = container.offsetWidth
    if (width <= 0) return
    const gap = readGridGap(container)
    columnWidth.value = computeFixedColumnWidth(width, settings.colCount.value, 0, 9999, gap, 0.8)
  }

  function createColumns(count: number): void {
    const next: number[][] = []
    for (let i = 0; i < count; i++) next.push([])
    columns.value = next
  }

  function buildColumns(count: number, container: HTMLElement | null): void {
    createColumns(count)
    const width = container ? container.offsetWidth : 0
    const gap = readGridGap(container)
    columnWidth.value = width > 0 ? computeFixedColumnWidth(width, count, 0, 9999, gap, 0.8) : columnWidth.value
  }

  function distribute(ids: number[], target: number[][]): void {
    const count = target.length
    if (count === 0) return
    ids.forEach((id, index) => {
      target[index % count].push(id)
    })
  }

  function markPlaceholder(id: number): void {
    const el = getCardElement(id)
    if (!el) return
    if (el.dataset.hPlaceholder) return
    el.dataset.hPlaceholder = '1'
  }

  function markHeightReady(id: number): void {
    const el = getCardElement(id)
    if (!el) return
    if (el.dataset.hReported) return
    el.dataset.hReported = '1'
    if (settings.mediaRatio.value !== 'original') return
    const gap = document.documentElement.scrollHeight - (window.innerHeight + window.scrollY)
    if (gap < BOTTOM_THRESHOLD && !rafId) startRebalance()
  }

  function resetHeightFlag(id: number): void {
    const el = getCardElement(id)
    if (!el) return
    el.dataset.hReported = ''
    el.dataset.hPlaceholder = ''
  }

  function reportHeights(ids: number[]): void {
    ids.forEach((id) => {
      const el = getCardElement(id)
      if (!el) return
      if (el.dataset.h) markHeightReady(id)
      else markPlaceholder(id)
    })
  }

  function loadNextPage(tab: string): void {
    if (loadingPage.value || channel.cancelled.value) return
    const ids = sortedIds.value
    if (ids.length === 0) return
    const perPage = cardsPerPage.value
    const start = currentPage.value * perPage
    if (start >= ids.length) return

    loadingPage.value = true
    const pageIds = ids.slice(start, start + perPage)
    const order = tabOrders.get(tab) || []
    pageIds.forEach((id) => order.push(id))
    tabOrders.set(tab, order)

    const cols = columns.value
    pageIds.forEach((id, index) => {
      const col = cols[index % cols.length]
      if (col) col.push(id)
    })

    currentPage.value += 1
    loadingPage.value = false

    if (settings.mediaRatio.value === 'original') {
      void nextTick(() => reportHeights(pageIds))
    }
  }

  function resetAndLoad(tab: string, ids: number[], resetExplore: boolean): void {
    void resetExplore
    scrollPaused.value = false
    currentPage.value = 0
    tabOrders.delete(tab)
    sortedIds.value = ids.slice()
    const count = settings.colCount.value
    buildColumns(count, deps ? deps.getContainer() : null)
    loadNextPage(tab)
    void nextTick(() => refreshSentinel())
  }

  function restore(tab: string, ids: number[], nextIds: () => number[]): void {
    const count = settings.colCount.value
    buildColumns(count, deps ? deps.getContainer() : null)
    distribute(ids, columns.value)
    tabOrders.set(tab, ids.slice())
    sortedIds.value = nextIds()
    currentPage.value = Math.ceil(ids.length / Math.max(1, cardsPerPage.value))
    if (settings.mediaRatio.value === 'original') {
      void nextTick(() => {
        ids.forEach((id) => resetHeightFlag(id))
        reportHeights(ids)
      })
    }
    void nextTick(() => refreshSentinel())
  }

  function rebuild(tab: string): void {
    const order = (tabOrders.get(tab) || []).slice()
    const count = settings.colCount.value
    buildColumns(count, deps ? deps.getContainer() : null)
    distribute(order, columns.value)
    currentPage.value = Math.ceil(order.length / Math.max(1, cardsPerPage.value))
    if (settings.mediaRatio.value === 'original') {
      void nextTick(() => {
        order.forEach((id) => resetHeightFlag(id))
        reportHeights(order)
      })
    }
    void nextTick(() => refreshSentinel())
  }

  function getOrder(tab: string): number[] {
    return (tabOrders.get(tab) || []).slice()
  }

  function setOrder(tab: string, ids: number[]): void {
    tabOrders.set(tab, ids.slice())
  }

  function hasOrder(tab: string): boolean {
    const order = tabOrders.get(tab)
    return Boolean(order && order.length > 0)
  }

  function removeCard(tab: string, id: number): void {
    const order = tabOrders.get(tab)
    if (order) {
      const index = order.indexOf(id)
      if (index !== -1) order.splice(index, 1)
    }
    const cols = columns.value
    for (const col of cols) {
      const index = col.indexOf(id)
      if (index !== -1) col.splice(index, 1)
    }
  }

  function getColumnElements(): HTMLElement[] {
    return deps ? deps.getColumns() : []
  }

  function getLastVisibleCard(col: HTMLElement): HTMLElement | null {
    const cards = col.querySelectorAll<HTMLElement>('.media-card')
    if (cards.length === 0) return null
    for (let i = cards.length - 1; i >= 0; i--) {
      const rect = cards[i].getBoundingClientRect()
      if (rect.bottom <= window.innerHeight + VISIBLE_MARGIN) return cards[i]
    }
    return null
  }

  function getSecondLastVisibleCard(col: HTMLElement, lastCard: HTMLElement): HTMLElement | null {
    const cards = col.querySelectorAll<HTMLElement>('.media-card')
    let found = false
    for (let i = cards.length - 1; i >= 0; i--) {
      if (cards[i] === lastCard) {
        found = true
        continue
      }
      if (found) {
        const rect = cards[i].getBoundingClientRect()
        if (rect.bottom <= window.innerHeight + VISIBLE_MARGIN) return cards[i]
      }
    }
    return null
  }

  function moveCardTo(id: number, from: number, to: number): void {
    const cols = columns.value
    if (!cols[from] || !cols[to]) return
    const index = cols[from].indexOf(id)
    if (index === -1) return
    cols[from].splice(index, 1)
    cols[to].push(id)
  }

  function permute(list: number[]): number[][] {
    if (list.length <= 1) return [list.slice()]
    const result: number[][] = []
    for (let i = 0; i < list.length; i++) {
      const rest = list.slice(0, i).concat(list.slice(i + 1))
      for (const item of permute(rest)) result.push([list[i], ...item])
    }
    return result
  }

  /**
   * 再平衡: 基于可见区域位置的两阶段贪心
   * 阶段一 移动: 从最高列移末尾卡片到最低列
   * 阶段二 交换: 末尾卡片全局重分配, 列内卡片数不变
   */
  async function tryRebalance(): Promise<boolean> {
    if (rebalancing) return false
    const elements = getColumnElements()
    const count = elements.length
    if (count < 2) return false

    const sy = window.scrollY
    const lastVisible: Array<{ colIdx: number; el: HTMLElement; bottom: number }> = []
    for (let i = 0; i < count; i++) {
      const el = getLastVisibleCard(elements[i])
      if (!el) return false
      lastVisible.push({ colIdx: i, el, bottom: el.getBoundingClientRect().bottom + sy })
    }

    let maxBottom = lastVisible[0].bottom
    let minBottom = lastVisible[0].bottom
    for (let i = 1; i < count; i++) {
      if (lastVisible[i].bottom > maxBottom) maxBottom = lastVisible[i].bottom
      if (lastVisible[i].bottom < minBottom) minBottom = lastVisible[i].bottom
    }
    const currentGap = maxBottom - minBottom
    if (currentGap < 1) return false

    const gap = readGridGap(elements[0])
    rebalancing = true
    let acted = false

    try {
      /* 阶段一: 移动贪心 */
      let tallIdx = 0
      let shortIdx = 0
      for (let i = 1; i < count; i++) {
        if (lastVisible[i].bottom > lastVisible[tallIdx].bottom) tallIdx = i
        if (lastVisible[i].bottom < lastVisible[shortIdx].bottom) shortIdx = i
      }

      if (tallIdx !== shortIdx && (columns.value[tallIdx]?.length ?? 0) > 1) {
        const moveEl = lastVisible[tallIdx].el
        const moveId = Number(moveEl.dataset.id)
        const moveHeight = moveEl.getBoundingClientRect().height
        const secondLast = getSecondLastVisibleCard(elements[tallIdx], moveEl)
        const newTallBottom = secondLast ? secondLast.getBoundingClientRect().bottom + sy : 0
        const newShortBottom = lastVisible[shortIdx].bottom + gap + moveHeight

        let newMax = Math.max(newTallBottom, newShortBottom)
        for (let i = 0; i < count; i++) {
          if (i === tallIdx || i === shortIdx) continue
          if (lastVisible[i].bottom > newMax) newMax = lastVisible[i].bottom
        }
        let newMin = Math.min(newTallBottom, newShortBottom)
        for (let i = 0; i < count; i++) {
          if (i === tallIdx || i === shortIdx) continue
          if (lastVisible[i].bottom < newMin) newMin = lastVisible[i].bottom
        }

        if (newMax - newMin < currentGap - 2) {
          moveCardTo(moveId, tallIdx, shortIdx)
          acted = true
          await nextTick()
        }
      }

      /* 阶段二: 交换贪心 */
      const sySecond = window.scrollY
      const items: Array<{ colIdx: number; el: HTMLElement; bottom: number }> = []
      for (let i = 0; i < count; i++) {
        const el = getLastVisibleCard(elements[i])
        if (!el) return acted
        items.push({ colIdx: i, el, bottom: el.getBoundingClientRect().bottom + sySecond })
      }

      let curMax = items[0].bottom
      let curMin = items[0].bottom
      for (let i = 1; i < count; i++) {
        if (items[i].bottom > curMax) curMax = items[i].bottom
        if (items[i].bottom < curMin) curMin = items[i].bottom
      }
      const curGap = curMax - curMin
      if (curGap < 1) return acted

      const bases: number[] = []
      const cardHeights: number[] = []
      for (let i = 0; i < count; i++) {
        const colEl = elements[items[i].colIdx]
        const last = items[i].el
        const secondLast = getSecondLastVisibleCard(colEl, last)
        bases.push(secondLast ? secondLast.getBoundingClientRect().bottom + sySecond : 0)
        cardHeights.push(last.getBoundingClientRect().height)
      }

      const indices = Array.from({ length: count }, (_, i) => i)
      const perms = permute(indices)
      let bestGap = curGap
      let bestPerm: number[] | null = null

      for (const perm of perms) {
        let permMax = 0
        let permMin = Number.POSITIVE_INFINITY
        for (let j = 0; j < count; j++) {
          const newBottom = bases[j] + gap + cardHeights[perm[j]]
          if (newBottom > permMax) permMax = newBottom
          if (newBottom < permMin) permMin = newBottom
        }
        const permGap = permMax - permMin
        if (permGap < bestGap) {
          bestGap = permGap
          bestPerm = perm
        }
      }

      if (bestPerm && bestGap < curGap - 2) {
        const moving: Array<{ id: number; to: number }> = []
        for (let j = 0; j < count; j++) {
          const cardIdx = bestPerm[j]
          const target = items[j].colIdx
          const id = Number(items[cardIdx].el.dataset.id)
          const currentCol = columns.value.findIndex((col) => col.indexOf(id) !== -1)
          if (currentCol === target || currentCol === -1) continue
          moving.push({ id, to: target })
        }
        if (moving.length > 0) {
          const cols = columns.value
          moving.forEach((item) => {
            const sourceIdx = cols.findIndex((col) => col.indexOf(item.id) !== -1)
            if (sourceIdx === -1) return
            cols[sourceIdx].splice(cols[sourceIdx].indexOf(item.id), 1)
          })
          moving.forEach((item) => {
            const col = cols[item.to]
            if (col) col.push(item.id)
          })
          acted = true
          await nextTick()
        }
      }

      return acted
    } finally {
      rebalancing = false
    }
  }

  async function rebalanceLoop(): Promise<void> {
    if (!atBottom.value || settings.mediaRatio.value !== 'original') {
      rafId = 0
      return
    }
    const scrollBottom = window.innerHeight + window.scrollY
    const pageHeight = document.documentElement.scrollHeight
    if (pageHeight - scrollBottom >= REBALANCE_STOP_GAP) {
      atBottom.value = false
      rafId = 0
      return
    }
    const acted = await tryRebalance()
    if (acted && atBottom.value) {
      rafId = requestAnimationFrame(() => {
        void rebalanceLoop()
      })
    } else {
      rafId = 0
    }
  }

  function startRebalance(): void {
    if (rafId) return
    rafId = requestAnimationFrame(() => {
      void rebalanceLoop()
    })
  }

  function cancelRebalance(): void {
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
    atBottom.value = false
  }

  function handleWindowScroll(): void {
    if (settings.mediaRatio.value !== 'original') {
      if (atBottom.value) {
        atBottom.value = false
        if (rafId) {
          cancelAnimationFrame(rafId)
          rafId = 0
        }
      }
      lastScrollY = window.scrollY
      return
    }
    const currentY = window.scrollY
    const scrollBottom = window.innerHeight + currentY
    const pageHeight = document.documentElement.scrollHeight
    const isAtBottom = pageHeight - scrollBottom < BOTTOM_THRESHOLD

    if (isAtBottom) {
      atBottom.value = true
      startRebalance()
    } else if (currentY < lastScrollY && atBottom.value) {
      atBottom.value = false
      if (rafId) {
        cancelAnimationFrame(rafId)
        rafId = 0
      }
    }
    lastScrollY = currentY
  }

  function bindWindow(): void {
    if (windowBound || typeof window === 'undefined') return
    windowBound = true
    lastScrollY = window.scrollY
    window.addEventListener('scroll', handleWindowScroll, { passive: true })
  }

  function unbindWindow(): void {
    if (!windowBound) return
    windowBound = false
    window.removeEventListener('scroll', handleWindowScroll)
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
  }

  function attachSentinel(el: HTMLElement | null): void {
    if (!el) return
    if (!sentinelObserver) {
      sentinelObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return
            if (scrollPaused.value || channel.cancelled.value) return
            if (loader) loader()
            void nextTick(() => refreshSentinel())
          })
        },
        { rootMargin: '200px' }
      )
    }
    if (sentinelEl && sentinelEl !== el) sentinelObserver.unobserve(sentinelEl)
    sentinelEl = el
    sentinelObserver.observe(el)
  }

  function refreshSentinel(): void {
    if (!sentinelObserver || !sentinelEl) return
    sentinelObserver.unobserve(sentinelEl)
    sentinelObserver.observe(sentinelEl)
  }

  function setScrollPaused(value: boolean): void {
    scrollPaused.value = value
  }

  cachedContext = {
    columns,
    sortedIds,
    currentPage,
    loadingPage,
    scrollPaused,
    columnWidth,
    atBottom,
    cardsPerPage,
    noMore,
    attach,
    detach,
    setLoader,
    getCardElement,
    applyColumnWidths,
    createColumns,
    buildColumns,
    resetAndLoad,
    restore,
    rebuild,
    loadNextPage,
    getOrder,
    setOrder,
    hasOrder,
    removeCard,
    markPlaceholder,
    markHeightReady,
    resetHeightFlag,
    startRebalance,
    cancelRebalance,
    attachSentinel,
    refreshSentinel,
    bindWindow,
    unbindWindow,
    setScrollPaused
  }
  return cachedContext
}
