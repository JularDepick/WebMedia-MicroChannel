<template>
  <div id="labelFilterBar" class="label-filter-bar" :style="{ display: visible ? '' : 'none' }">
    <div class="label-filter-row">
      <button
        type="button"
        class="label-filter-mode"
        :class="{ partial: mode === 'partial' }"
        id="labelFilterMode"
        @click="toggleMode"
      >{{ mode === 'partial' ? '部分匹配' : '完整匹配' }}</button>
      <button type="button" class="label-filter-clear" id="labelFilterClear" @click="clearAll">清空</button>
      <div class="label-filter-input-wrap" id="labelFilterWrap" @click="focusInput">
        <span class="label-filter-tags" id="labelFilterTags">
          <span v-for="(label, index) in labels" :key="label" class="label-filter-tag">
            <span>{{ label }}</span>
            <span class="remove" @click.stop="removeAt(index)">&times;</span>
          </span>
        </span>
        <input
          ref="inputEl"
          type="text"
          class="label-filter-input"
          id="labelFilterInput"
          placeholder="输入标签后回车筛选"
          @keydown="onKeydown"
          @keypress="onKeypress"
          @input="onInput"
        />
      </div>
    </div>
    <span class="label-filter-hint" id="labelFilterHint">{{ hint }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  labels: string[]
  mode: 'exact' | 'partial'
  visible: boolean
}>()

const emit = defineEmits<{
  (event: 'update:labels', value: string[]): void
  (event: 'update:mode', value: 'exact' | 'partial'): void
  (event: 'change', payload: { labels: string[]; mode: 'exact' | 'partial' }): void
}>()

const inputEl = ref<HTMLInputElement | null>(null)

const hint = computed(() => {
  if (props.labels.length > 0) {
    const modeText = props.mode === 'partial' ? '部分匹配' : '完整匹配'
    return '已选 ' + props.labels.length + ' 个标签，' + modeText + '，取交集'
  }
  return '输入标签筛选媒体，多个标签取交集，留空显示全部'
})

function focusInput(): void {
  if (inputEl.value) inputEl.value.focus()
}

function apply(labels: string[], mode: 'exact' | 'partial'): void {
  emit('update:labels', labels)
  emit('update:mode', mode)
  emit('change', { labels, mode })
}

function addLabel(): void {
  const input = inputEl.value
  if (!input) return
  const value = input.value.replace(/,/g, '').trim()
  if (value && props.labels.indexOf(value) === -1) {
    apply([...props.labels, value], props.mode)
  }
  input.value = ''
}

function removeAt(index: number): void {
  const next = props.labels.slice()
  next.splice(index, 1)
  apply(next, props.mode)
}

function clearAll(): void {
  if (props.labels.length === 0) return
  if (inputEl.value) inputEl.value.value = ''
  apply([], props.mode)
}

function toggleMode(): void {
  const next = props.mode === 'exact' ? 'partial' : 'exact'
  if (props.labels.length > 0) apply(props.labels.slice(), next)
  else emit('update:mode', next)
}

function onKeydown(event: KeyboardEvent): void {
  const input = inputEl.value
  if (!input) return
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault()
    addLabel()
    return
  }
  if (event.key === 'Backspace' && input.value === '' && props.labels.length > 0) {
    const next = props.labels.slice()
    next.pop()
    apply(next, props.mode)
  }
}

function onKeypress(event: KeyboardEvent): void {
  if (event.key === 'Enter') event.preventDefault()
}

function onInput(): void {
  const input = inputEl.value
  if (!input) return
  if (input.value.indexOf(',') !== -1) addLabel()
}

defineExpose({ focusInput })
</script>
