<template>
  <div ref="wrapEl" :class="[wrapperCls, { open: isOpen }]">
    <div
      ref="triggerEl"
      :class="[triggerCls, triggerStateClass]"
      :style="triggerStyle"
      @mousedown="onPressStart"
      @mouseup="onPressEnd"
      @mouseleave="onPressEnd"
      @click="onTriggerClick"
      @contextmenu="onContextMenu"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchEnd"
    >{{ displayText }}</div>
    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="dropdownEl"
        :class="[dropdownCls, { open: isOpen }]"
        :style="dropdownStyle"
        @wheel.prevent="onWheel"
      >
        <div
          v-for="(item, index) in items"
          :key="String(item.value)"
          :class="[optionCls, { selected: index === activeIndex }]"
          @mousedown.prevent.stop="onSelect(index)"
        >{{ item.text }}</div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

interface DropdownItem {
  text: string
  value: string | number
}

type DropdownMode = 'click' | 'longpress' | 'contextmenu'
type LongPressTrigger = 'immediate' | 'release'
type DropdownIndicator = 'none' | 'border-bottom' | 'border-top'

const props = withDefaults(
  defineProps<{
    items: DropdownItem[]
    modelValue?: string | number | null
    mode?: DropdownMode
    longPressMs?: number
    longPressTrigger?: LongPressTrigger
    indicator?: DropdownIndicator
    wrapperCls?: string
    triggerCls?: string
    dropdownCls?: string
    optionCls?: string
    label?: string
    extraTriggerClass?: string
  }>(),
  {
    modelValue: null,
    mode: 'click',
    longPressMs: 300,
    longPressTrigger: 'immediate',
    indicator: 'border-bottom',
    wrapperCls: 'custom-select',
    triggerCls: 'custom-select-value',
    dropdownCls: 'custom-select-dropdown',
    optionCls: 'custom-select-option',
    label: undefined,
    extraTriggerClass: ''
  }
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: string | number): void
  (event: 'change', value: string | number, index: number): void
  (event: 'open'): void
  (event: 'trigger-click', longPressFired: boolean): void
}>()

const wrapEl = ref<HTMLElement | null>(null)
const triggerEl = ref<HTMLElement | null>(null)
const dropdownEl = ref<HTMLElement | null>(null)

const isOpen = ref(false)
const pressed = ref(false)
const bounced = ref(false)
const activeIndex = ref(-1)
const minWidth = ref('')
const dropdownTop = ref(0)
const dropdownLeft = ref(0)

let pressTimer: ReturnType<typeof setTimeout> | null = null
let longPressFired = false
let bounceTimer: ReturnType<typeof setTimeout> | null = null
let touchStartX = 0
let touchStartY = 0

const displayText = computed(() => {
  if (props.label !== undefined) return props.label
  const item = props.items[activeIndex.value]
  return item ? item.text : ''
})

const triggerStateClass = computed(() => ({
  pressed: pressed.value,
  'select-bounce': bounced.value,
  ['indicator-' + props.indicator]: isOpen.value && props.indicator !== 'none',
  [props.extraTriggerClass]: Boolean(props.extraTriggerClass)
}))

const triggerStyle = computed(() => (minWidth.value ? { minWidth: minWidth.value } : {}))
const dropdownStyle = computed(() => ({
  top: dropdownTop.value + 'px',
  left: dropdownLeft.value + 'px',
  minWidth: minWidth.value || '0'
}))

function syncActiveIndex(): void {
  const value = props.modelValue
  if (value === null || value === undefined) {
    activeIndex.value = -1
    return
  }
  const index = props.items.findIndex((item) => item.value === value)
  activeIndex.value = index
}

watch(() => props.modelValue, syncActiveIndex, { immediate: true })
watch(
  () => props.items,
  () => syncActiveIndex(),
  { deep: true }
)

function clearPressTimer(): void {
  if (pressTimer) {
    clearTimeout(pressTimer)
    pressTimer = null
  }
}

function onPressStart(): void {
  pressed.value = true
  if (props.mode === 'click') return
  if (isOpen.value) return
  clearPressTimer()
  longPressFired = false
  pressTimer = setTimeout(() => {
    longPressFired = true
    if (props.longPressTrigger === 'immediate') open()
  }, props.longPressMs)
}

function onPressEnd(): void {
  pressed.value = false
  const hadTimer = Boolean(pressTimer)
  clearPressTimer()
  if (props.longPressTrigger === 'release' && longPressFired && !isOpen.value) open()
  if (hadTimer && !longPressFired) pressed.value = false
}

function onTouchStart(event: TouchEvent): void {
  const touch = event.touches[0]
  if (!touch) return
  touchStartX = touch.clientX
  touchStartY = touch.clientY
  if (props.mode === 'click') return
  onPressStart()
}

function onTouchMove(event: TouchEvent): void {
  const touch = event.touches[0]
  if (!touch) return
  if (Math.abs(touch.clientX - touchStartX) > 10 || Math.abs(touch.clientY - touchStartY) > 10) onPressEnd()
}

function onTouchEnd(): void {
  onPressEnd()
}

function onTriggerClick(event: MouseEvent): void {
  if (longPressFired) {
    longPressFired = false
    event.stopPropagation()
    return
  }
  if (props.mode === 'click') {
    event.stopPropagation()
    if (isOpen.value) {
      close()
      return
    }
    emit('open')
    open()
    return
  }
  emit('trigger-click', false)
}

function onContextMenu(event: MouseEvent): void {
  if (props.mode === 'contextmenu') {
    event.preventDefault()
    if (isOpen.value) close()
    else open()
    return
  }
  if (props.mode === 'longpress') {
    event.preventDefault()
    open()
  }
}

function onWheel(event: WheelEvent): void {
  event.preventDefault()
  const el = dropdownEl.value
  if (el) el.scrollTop += event.deltaY
}

function measure(): void {
  const trigger = triggerEl.value
  const dropdown = dropdownEl.value
  if (!trigger) return
  const rect = trigger.getBoundingClientRect()
  dropdownTop.value = rect.bottom + 4
  dropdownLeft.value = rect.left
  if (!dropdown) {
    minWidth.value = rect.width + 'px'
    return
  }
  let maxWidth = 0
  Array.from(dropdown.children).forEach((child) => {
    const el = child as HTMLElement
    if (el.offsetWidth > maxWidth) maxWidth = el.offsetWidth
  })
  minWidth.value = Math.max(rect.width, maxWidth) + 'px'
}

function open(): void {
  if (isOpen.value) return
  isOpen.value = true
  measure()
  void nextTick(() => {
    measure()
    const dropdown = dropdownEl.value
    if (!dropdown) return
    const selected = dropdown.querySelector('.' + props.optionCls + '.selected') as HTMLElement | null
    if (selected) selected.scrollIntoView({ block: 'nearest' })
  })
}

function close(): void {
  if (!isOpen.value) return
  isOpen.value = false
  pressed.value = false
}

function onSelect(index: number): void {
  const item = props.items[index]
  if (!item) return
  if (index === activeIndex.value) {
    close()
    return
  }
  activeIndex.value = index
  close()
  emit('update:modelValue', item.value)
  emit('change', item.value, index)
  bounced.value = false
  if (bounceTimer) clearTimeout(bounceTimer)
  void nextTick(() => {
    bounced.value = true
    bounceTimer = setTimeout(() => {
      bounced.value = false
      bounceTimer = null
    }, 260)
  })
}

function onDocumentMouseDown(event: MouseEvent): void {
  if (!isOpen.value) return
  const target = event.target as Node | null
  if (!target) return
  if (wrapEl.value && wrapEl.value.contains(target)) return
  if (dropdownEl.value && dropdownEl.value.contains(target)) return
  close()
}

if (typeof document !== 'undefined') document.addEventListener('mousedown', onDocumentMouseDown)

onBeforeUnmount(() => {
  clearPressTimer()
  if (bounceTimer) clearTimeout(bounceTimer)
  if (typeof document !== 'undefined') document.removeEventListener('mousedown', onDocumentMouseDown)
})

/* 供父组件取得外层元素, 用于溢出测量与样式控制 */
function getWrapElement(): HTMLElement | null {
  return wrapEl.value
}

defineExpose({ open, close, isOpen, getWrapElement })
</script>
