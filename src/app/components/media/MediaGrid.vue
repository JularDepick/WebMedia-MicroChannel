<template>
  <div
    id="gridContainer"
    ref="containerEl"
    class="grid-container"
    :class="{ 'layout-original': isOriginal }"
    :style="gridStyle"
  >
    <div
      v-for="(column, colIdx) in layout.columns.value"
      :key="colIdx"
      :ref="(el) => setColumnRef(el, colIdx)"
      class="original-column"
      :style="{ width: layout.columnWidth.value + 'px' }"
    >
      <MediaCard
        v-for="id in column"
        :key="id"
        :id="id"
        :tab="tab"
        @remove="onCardRemove"
      />
      <div
        v-if="colIdx === layout.columns.value.length - 1"
        :ref="setSentinelRef"
        style="height: 1px"
      ></div>
    </div>
  </div>

  <div id="loadIndicator" class="load-indicator" v-show="layout.loadingPage.value">
    <div class="load-spinner"></div>
    <span>加载中...</span>
  </div>

  <div id="noMore" class="no-more">已经到底了</div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { TabKey } from '~~/shared/types/channel'
import { ratioToAspect } from '~/utils/layout'
import MediaCard from '~/components/media/MediaCard.vue'
import { useMediaLayout } from '~/composables/useMediaLayout'
import { useSettings } from '~/composables/useSettings'

const props = defineProps<{
  tab: TabKey
}>()

const emit = defineEmits<{
  (event: 'remove', id: number): void
}>()

const layout = useMediaLayout()
const settings = useSettings()

const containerEl = ref<HTMLElement | null>(null)
const sentinelEl = ref<HTMLElement | null>(null)
const columnEls = new Map<number, HTMLElement>()

let resizeObserver: ResizeObserver | null = null

const isOriginal = computed(() => settings.mediaRatio.value === 'original')
const gridStyle = computed(() => {
  const aspect = ratioToAspect(settings.mediaRatio.value)
  if (!aspect) return undefined
  return { '--media-ratio': aspect } as Record<string, string>
})

function setColumnRef(el: unknown, index: number): void {
  if (el instanceof HTMLElement) columnEls.set(index, el)
  else columnEls.delete(index)
}

function setSentinelRef(el: unknown): void {
  sentinelEl.value = el instanceof HTMLElement ? el : null
}

function getColumnElements(): HTMLElement[] {
  const list: HTMLElement[] = []
  const total = layout.columns.value.length
  for (let i = 0; i < total; i++) {
    const el = columnEls.get(i)
    if (el) list.push(el)
  }
  return list
}

function onCardRemove(id: number): void {
  emit('remove', id)
}

function attachSentinel(): void {
  if (sentinelEl.value) layout.attachSentinel(sentinelEl.value)
}

onMounted(() => {
  layout.attach({
    getContainer: () => containerEl.value,
    getColumns: () => getColumnElements(),
    getCardElement: (id: number) => {
      const container = containerEl.value
      if (!container) return null
      return container.querySelector<HTMLElement>('.media-card[data-id="' + id + '"]')
    }
  })
  layout.applyColumnWidths()
  attachSentinel()

  if (typeof ResizeObserver !== 'undefined' && containerEl.value) {
    resizeObserver = new ResizeObserver(() => {
      layout.applyColumnWidths()
    })
    resizeObserver.observe(containerEl.value)
  }
})

watch(
  () => layout.columns.value.length,
  () => {
    void nextTick(() => {
      layout.applyColumnWidths()
      attachSentinel()
    })
  }
)

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  layout.detach()
})
</script>
