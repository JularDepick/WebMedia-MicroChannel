<template>
  <aside id="sidebar" ref="asideEl" class="sidebar" :class="{ collapsed: isCollapsed }">
    <div class="sidebar-buttons">
      <button
        id="btnPrevTag"
        class="sidebar-btn"
        title="上一个书签"
        :style="disabledStyle"
        @click="jump('prev')"
      >
        <span class="btn-icon">&#9650;</span>
        <span class="btn-label">上书签</span>
      </button>
      <button
        id="btnAddTag"
        class="sidebar-btn"
        title="新增书签"
        :style="disabledStyle"
        @click="onAddTag"
      >
        <span class="btn-icon">&#10010;</span>
        <span class="btn-label">新增</span>
      </button>
      <button
        id="btnNextTag"
        class="sidebar-btn"
        title="下一个书签"
        :style="disabledStyle"
        @click="jump('next')"
      >
        <span class="btn-icon">&#9660;</span>
        <span class="btn-label">下书签</span>
      </button>
      <button
        id="btnClearTags"
        ref="clearBtnEl"
        class="sidebar-btn"
        :class="{ 'confirm-state': clearConfirming }"
        title="清空书签"
        :style="disabledStyle"
        @click="onClearTags"
      >
        <span class="btn-icon">&#10006;</span>
        <span class="btn-label">{{ clearConfirming ? '确认' : '清空' }}</span>
      </button>
    </div>
  </aside>

  <button
    id="sidebarExpand"
    class="sidebar-expand-btn"
    title="展开侧栏"
    :style="{ display: isCollapsed && enabled ? 'flex' : 'none' }"
    @click="toggleSidebar"
  >|</button>

  <div id="tagLayer" class="tag-layer">
    <div
      v-for="tag in visibleTags"
      :key="tag.id"
      class="tag-item"
      :class="{ expanded: expandedId === tag.id }"
      :data-tag-id="tag.id"
      :data-scroll-y="tag.scrollY"
      :style="{ top: tagTop(tag) + 'px' }"
    >
      <div
        class="tag-collapsed"
        :class="{ dragging: draggingId === tag.id }"
        :title="tag.name"
        @click="onCollapsedClick(tag)"
        @mousedown="onPressStart($event, tag)"
        @mouseup="onPressEnd"
        @mouseleave="onPressEnd"
        @touchstart="onTouchStart($event, tag)"
        @touchend="onPressEnd"
        @touchcancel="onPressEnd"
      >&#9664;</div>
      <div class="tag-expanded">
        <span
          class="tag-name"
          :ref="(el) => setNameRef(el, tag.id)"
          :contenteditable="renamingId === tag.id"
          @dblclick="startRename(tag)"
          @blur="finishRename(tag)"
          @keydown="onNameKeydown($event, tag)"
        >{{ tag.name }}</span>
        <button class="tag-action-btn" title="删除" @click.stop="onDelete(tag)">&times;</button>
        <button class="tag-action-btn" title="收起" @click.stop="collapseAll">&#9654;</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useBookmarks, type BookmarkTag } from '~/composables/useBookmarks'
import { useToast } from '~/composables/useToast'

/* 长按拖动阈值(ms) */
const PRESS_DELAY = 400
/* 二次确认回退时长(ms) */
const CONFIRM_TIMEOUT = 3000
/* 书签最小可拖动高度(px) */
const TAG_MIN_ROOM = 28

const props = defineProps<{
  collapsed: boolean
  enabled: boolean
  currentTab: string
  navHeight: number
}>()

const emit = defineEmits<{
  (event: 'update:collapsed', value: boolean): void
}>()

const bookmarks = useBookmarks()
const { showToast } = useToast()

const asideEl = ref<HTMLElement | null>(null)
const clearBtnEl = ref<HTMLElement | null>(null)
const clearConfirming = ref(false)
const renamingId = ref('')
const draggingId = ref('')
const dragTop = ref(0)

const nameElements = new Map<string, HTMLElement>()

let pressTimer: ReturnType<typeof setTimeout> | null = null
let confirmTimer: ReturnType<typeof setTimeout> | null = null
let dragOffsetY = 0
let dragStartY = 0
let dragging = false
let suppressClick = false

/* 探索与标签页禁用侧栏, 与禁用状态合并为收起效果 */
const isCollapsed = computed(() => props.collapsed || !props.enabled)
const expandedId = computed(() => bookmarks.expandedId.value)
const visibleTags = computed<BookmarkTag[]>(() =>
  props.currentTab === 'explore' ? [] : bookmarks.tags.value
)
const disabledStyle = computed(() =>
  props.enabled ? undefined : { pointerEvents: 'none' as const, opacity: '0.3' }
)

function tagTop(tag: BookmarkTag): number {
  if (draggingId.value === tag.id) return dragTop.value
  return tag.scrollY + props.navHeight
}

function setNameRef(el: unknown, id: string): void {
  if (el instanceof HTMLElement) nameElements.set(id, el)
  else nameElements.delete(id)
}

function toggleSidebar(): void {
  emit('update:collapsed', !props.collapsed)
}

function onCollapsedClick(tag: BookmarkTag): void {
  if (suppressClick) {
    suppressClick = false
    return
  }
  bookmarks.expandTag(tag.id)
  if (!props.collapsed) emit('update:collapsed', true)
}

function jump(direction: 'prev' | 'next'): void {
  if (!props.enabled) return
  const target = bookmarks.jumpToTag(direction)
  if (target === null) return
  window.scrollTo(0, target)
}

function onAddTag(): void {
  if (!props.enabled) return
  const scrollY = window.scrollY || document.documentElement.scrollTop || 0
  bookmarks.addTag(scrollY)
  showToast('已添加书签')
}

function resetClearBtn(): void {
  clearConfirming.value = false
  if (confirmTimer) {
    clearTimeout(confirmTimer)
    confirmTimer = null
  }
}

function onClearTags(): void {
  if (!props.enabled) return
  if (clearConfirming.value) {
    resetClearBtn()
    bookmarks.clearAll()
    showToast('已清空当前页书签')
    return
  }
  clearConfirming.value = true
  if (confirmTimer) clearTimeout(confirmTimer)
  confirmTimer = setTimeout(resetClearBtn, CONFIRM_TIMEOUT)
}

function startRename(tag: BookmarkTag): void {
  suppressClick = true
  renamingId.value = tag.id
  void nextTick(() => {
    const el = nameElements.get(tag.id)
    if (!el) return
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    const selection = window.getSelection()
    if (selection) {
      selection.removeAllRanges()
      selection.addRange(range)
    }
  })
}

function finishRename(tag: BookmarkTag): void {
  if (renamingId.value !== tag.id) return
  const el = nameElements.get(tag.id)
  const nextName = el ? (el.textContent || '').trim() : ''
  renamingId.value = ''
  if (nextName && nextName !== tag.name) {
    bookmarks.renameTag(tag.id, nextName)
    return
  }
  if (el) el.textContent = tag.name
}

function onNameKeydown(event: KeyboardEvent, tag: BookmarkTag): void {
  if (event.key !== 'Enter') return
  event.preventDefault()
  const el = nameElements.get(tag.id)
  if (el) el.blur()
}

function onDelete(tag: BookmarkTag): void {
  bookmarks.deleteTag(tag.id)
}

function collapseAll(): void {
  bookmarks.collapseAll()
}

function onPressStart(event: MouseEvent, tag: BookmarkTag): void {
  if (event.button !== 0) return
  dragStartY = event.clientY
  if (pressTimer) clearTimeout(pressTimer)
  pressTimer = setTimeout(() => beginDrag(tag, dragStartY), PRESS_DELAY)
}

function onTouchStart(event: TouchEvent, tag: BookmarkTag): void {
  const touch = event.touches[0]
  if (!touch) return
  dragStartY = touch.clientY
  if (pressTimer) clearTimeout(pressTimer)
  pressTimer = setTimeout(() => beginDrag(tag, dragStartY), PRESS_DELAY)
}

function onPressEnd(): void {
  if (pressTimer) {
    clearTimeout(pressTimer)
    pressTimer = null
  }
}

function beginDrag(tag: BookmarkTag, clientY: number): void {
  pressTimer = null
  dragging = true
  suppressClick = true
  draggingId.value = tag.id
  dragTop.value = tag.scrollY + props.navHeight
  dragOffsetY = clientY - dragTop.value + window.scrollY
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
  document.addEventListener('touchmove', onDragMove, { passive: false })
  document.addEventListener('touchend', onDragEnd)
}

function onDragMove(event: MouseEvent | TouchEvent): void {
  if (!dragging) return
  const source = 'touches' in event ? event.touches[0] : (event as MouseEvent)
  if (!source) return
  if ('preventDefault' in event) event.preventDefault()
  const documentTop = source.clientY + window.scrollY - dragOffsetY
  const min = window.scrollY + props.navHeight
  const max = window.scrollY + window.innerHeight - TAG_MIN_ROOM
  dragTop.value = Math.max(min, Math.min(documentTop, max))
}

function onDragEnd(): void {
  if (!dragging) return
  dragging = false
  const id = draggingId.value
  draggingId.value = ''
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
  document.removeEventListener('touchmove', onDragMove)
  document.removeEventListener('touchend', onDragEnd)
  if (!id) return
  bookmarks.setTagScroll(id, Math.max(0, dragTop.value - props.navHeight))
}

function onDocumentClick(event: MouseEvent): void {
  const target = event.target as HTMLElement | null
  if (!target) return
  /* 点击二次确认按钮之外的区域立即回退 */
  if (clearConfirming.value && clearBtnEl.value && !clearBtnEl.value.contains(target)) resetClearBtn()
  if (!target.closest('.tag-item')) bookmarks.collapseAll()
  /* 点击侧栏与展开按钮之外的区域收起侧栏 */
  if (!isCollapsed.value && asideEl.value && !asideEl.value.contains(target) && !target.closest('#sidebarExpand')) {
    emit('update:collapsed', true)
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
  document.removeEventListener('touchmove', onDragMove)
  document.removeEventListener('touchend', onDragEnd)
  onPressEnd()
  if (confirmTimer) clearTimeout(confirmTimer)
})

defineExpose({ resetClearBtn })
</script>
