<template>
  <div id="settingsPanel" ref="panelEl" class="settings-panel" :class="{ open }">
    <div class="settings-header">
      <span class="settings-title">设置</span>
      <button id="settingsClose" class="settings-close" @click="emit('update:open', false)">&times;</button>
    </div>
    <div class="settings-body" ref="bodyEl">
      <div class="settings-section">
        <div class="settings-label">视图列数</div>
        <div class="col-switch" id="colSwitch" ref="colSwitchEl">
          <button
            v-for="n in COLUMN_OPTIONS"
            :key="n"
            class="col-btn"
            :class="{ active: settings.colCount.value === n, disabled: n > settings.maxColumns.value, 'disabled-btn': n > settings.maxColumns.value }"
            :data-col="n"
            :style="{ pointerEvents: n > settings.maxColumns.value ? 'none' : undefined }"
            @click="onColClick(n)"
          >{{ n }}</button>
        </div>
      </div>
      <div class="settings-section">
        <div class="settings-label">卡片视窗比例</div>
        <div class="ratio-switch" id="ratioSwitch" ref="ratioSwitchEl">
          <button
            v-for="option in RATIO_OPTIONS"
            :key="option.key"
            class="ratio-btn"
            :class="{ active: settings.mediaRatio.value === option.key }"
            :data-ratio="option.key"
            @click="onRatioClick(option.key)"
          >{{ option.label }}</button>
        </div>
      </div>
      <div class="settings-section">
        <div class="settings-label">主题</div>
        <DropdownMenu
          id="themeSwitch"
          ref="themeDropRef"
          :items="themeItems"
          :model-value="theme.themeIndex.value"
          mode="click"
          @change="onThemeChange"
        />
      </div>
      <div class="settings-section">
        <div class="settings-label">数据更新周期</div>
        <div class="col-switch" id="cacheCycleSwitch" ref="cycleSwitchEl">
          <button
            v-for="option in settings.cacheCycleOptions"
            :key="option.value"
            class="col-btn"
            :class="{ active: settings.cacheCycle.value === option.value }"
            :data-cycle="option.value"
            @click="onCycleClick(option.value)"
          >{{ option.label }}</button>
        </div>
        <button
          id="btnForceRefresh"
          class="ratio-btn"
          style="margin-top: 4px; width: fit-content"
          :class="{ 'disabled-btn': settings.refreshDisabled.value }"
          @click="emit('force-refresh')"
        >{{ settings.refreshButtonText.value }}</button>
      </div>
      <div class="settings-section">
        <div class="settings-label">卡片标签栏</div>
        <div class="col-switch" id="labelBannerSwitch" ref="bannerSwitchEl">
          <button
            class="col-btn"
            :class="{ active: settings.showLabelBanner.value }"
            data-label-banner="1"
            @click="onLabelBannerClick(true)"
          >开启</button>
          <button
            class="col-btn"
            :class="{ active: !settings.showLabelBanner.value }"
            data-label-banner="0"
            @click="onLabelBannerClick(false)"
          >关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RATIO_OPTIONS } from '~~/shared/constants/site'
import DropdownMenu from '~/components/ui/DropdownMenu.vue'
import { useSettings } from '~/composables/useSettings'
import { useTheme } from '~/composables/useTheme'

/* 列数候选项 */
const COLUMN_OPTIONS = [1, 2, 3, 4, 5]

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'force-refresh'): void
}>()

interface DropdownExposed {
  open: () => void
  close: () => void
  isOpen: boolean
  getWrapElement: () => HTMLElement | null
}

const settings = useSettings()
const theme = useTheme()

const panelEl = ref<HTMLElement | null>(null)
const bodyEl = ref<HTMLElement | null>(null)
const colSwitchEl = ref<HTMLElement | null>(null)
const ratioSwitchEl = ref<HTMLElement | null>(null)
const cycleSwitchEl = ref<HTMLElement | null>(null)
const bannerSwitchEl = ref<HTMLElement | null>(null)
const themeDropRef = ref<DropdownExposed | null>(null)

const themeItems = theme.themes.map((item, index) => ({ text: item.name, value: index }))

function isPointInElement(x: number, y: number, el: HTMLElement | null): boolean {
  if (!el) return false
  const rect = el.getBoundingClientRect()
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
}

function onColClick(value: number): void {
  if (value > settings.maxColumns.value) return
  if (value === settings.colCount.value) return
  settings.setColCount(value)
}

function onRatioClick(ratio: string): void {
  if (ratio === settings.mediaRatio.value) return
  settings.setMediaRatio(ratio)
}

function onThemeChange(value: string | number): void {
  theme.applyTheme(Number(value))
}

function onCycleClick(value: number): void {
  if (value === settings.cacheCycle.value) return
  settings.setCacheCycle(value)
}

function onLabelBannerClick(value: boolean): void {
  if (value === settings.showLabelBanner.value) return
  settings.setShowLabelBanner(value)
}

function onDocumentClick(event: MouseEvent): void {
  if (!props.open) return
  const target = event.target as HTMLElement | null
  if (!target) return
  if (isPointInElement(event.clientX, event.clientY, panelEl.value)) return
  if (target.closest('#settingsToggle')) return
  if (target.closest('.custom-select-dropdown')) return
  if (target.closest('.tab-more-dropdown')) return
  emit('update:open', false)
}

function onDocumentWheel(event: WheelEvent): void {
  if (!props.open) return
  if (isPointInElement(event.clientX, event.clientY, panelEl.value)) {
    event.preventDefault()
    if (bodyEl.value) bodyEl.value.scrollTop += event.deltaY
    return
  }
  const dropdown = document.querySelector<HTMLElement>('.custom-select-dropdown')
  if (dropdown && isPointInElement(event.clientX, event.clientY, dropdown)) {
    event.preventDefault()
    dropdown.scrollTop += event.deltaY
    return
  }
  emit('update:open', false)
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('wheel', onDocumentWheel, { passive: false })
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('wheel', onDocumentWheel)
})
</script>

<style>
/* 主题下拉沿用设置面板的视觉, 与原生 select 的观感保持一致 */
#themeSwitch {
  width: fit-content;
}

#themeSwitch .custom-select-value {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
}

#themeSwitch .custom-select-value:hover,
#themeSwitch.open .custom-select-value {
  border-color: var(--accent);
}
</style>
