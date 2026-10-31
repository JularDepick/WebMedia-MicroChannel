/* ============================================================
   播放器与全屏查看
   音频与视频的播放、进度、音量、倍速、填充模式与控件自动隐藏
   ============================================================ */

import { computed, reactive, ref, type ComputedRef, type Ref } from 'vue'
import type { MediaType } from '~~/shared/types/channel'
import { useChannel } from './useChannel'
import { VIEW_COOLDOWN_IMG, VIEW_COOLDOWN_MEDIA, useStats } from './useStats'
import { useStorage } from './useStorage'

/* 填充模式 */
export type FillMode = 'horizontal' | 'vertical'
/* 控件自动隐藏延时(ms) */
export const PLAYER_HIDE_DELAY = 3000
/* 缩放步进倍率 */
const ZOOM_STEP = 1.3
const ZOOM_MAX = 10
const ZOOM_MIN = 0.2

interface FullscreenState {
  open: boolean
  id: number
  mode: MediaType | null
  scale: number
  translateX: number
  translateY: number
  dragging: boolean
  /* 打开时卡片内的播放位置 */
  startTime: number
}

interface PlayerUiState {
  playing: boolean
  progress: number
  buffered: number
  timeText: string
  muted: boolean
  volume: number
  speed: number
  controlsVisible: boolean
}

const fsState = reactive<FullscreenState>({
  open: false,
  id: 0,
  mode: null,
  scale: 1,
  translateX: 0,
  translateY: 0,
  dragging: false,
  startTime: 0
})

const uiState = reactive<PlayerUiState>({
  playing: false,
  progress: 0,
  buffered: 0,
  timeText: '0:00 / 0:00',
  muted: false,
  volume: 1,
  speed: 1,
  controlsVisible: false
})

/* 当前全屏媒体元素 */
const mediaElementState = ref<HTMLMediaElement | null>(null)
/* 卡片内媒体元素, 用于关闭全屏后恢复进度 */
const cardMedia = new Map<number, HTMLMediaElement>()
/* 填充模式 */
const fillModeState = ref<FillMode>('horizontal')
/* 视频固有尺寸 */
const videoWidthState = ref(0)
const videoHeightState = ref(0)
/* 视口尺寸 */
const viewportWidthState = ref(0)
const viewportHeightState = ref(0)
/* 填充模式缓存: videoId -> 视口尺寸 -> 模式 */
const fillCache = new Map<number, Map<string, FillMode>>()

let hideTimer: ReturnType<typeof setTimeout> | null = null
let mouseOverControls = false
let viewportBound = false
let dragStartX = 0
let dragStartY = 0
let fillModeLoaded = false

/* 播放时间格式化 0:00 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const rest = Math.floor(seconds % 60)
  return minutes + ':' + (rest < 10 ? '0' : '') + rest
}

function bindViewport(): void {
  if (viewportBound || typeof window === 'undefined') return
  viewportBound = true
  const update = () => {
    viewportWidthState.value = window.innerWidth
    viewportHeightState.value = window.innerHeight
  }
  update()
  window.addEventListener('resize', update, { passive: true })
}

export interface PlayerContext {
  /* 全屏状态 */
  fs: FullscreenState
  /* 播放器界面状态 */
  ui: PlayerUiState
  /* 填充模式 */
  fillMode: Ref<FillMode>
  /* 当前全屏媒体元素 */
  mediaElement: Ref<HTMLMediaElement | null>
  /* 读取卡片内媒体的播放位置 */
  getCardCurrentTime: (id: number) => number
  /* 缩放变换 */
  zoomTransform: ComputedRef<string>
  /* 视频内联样式 */
  videoStyle: ComputedRef<Record<string, string>>
  /* 打开全屏 */
  openFullscreen: (id: number) => void
  /* 关闭全屏 */
  closeFullscreen: () => void
  /* 注册全屏媒体元素 */
  registerMedia: (el: HTMLMediaElement | null) => void
  /* 注册卡片媒体元素 */
  registerCardMedia: (id: number, el: HTMLMediaElement | null) => void
  unregisterCardMedia: (id: number) => void
  /* 播放控制 */
  togglePlay: () => void
  seekToRatio: (ratio: number) => void
  seekByPointer: (clientX: number, left: number, width: number) => void
  toggleMute: () => void
  setVolume: (value: number) => void
  setSpeed: (value: number) => void
  /* 填充模式 */
  applyFillMode: (mode?: FillMode) => void
  toggleFillMode: () => void
  /* 缩放与拖拽 */
  zoomIn: () => void
  zoomOut: () => void
  zoomReset: () => void
  startDrag: (clientX: number, clientY: number) => void
  moveDrag: (clientX: number, clientY: number) => void
  endDrag: () => void
  /* 媒体事件 */
  onLoadedMetadata: () => void
  onTimeUpdate: () => void
  onProgress: () => void
  onPlay: () => void
  onPause: () => void
  onEnded: () => void
  /* 控件显隐 */
  showControls: () => void
  hideControls: () => void
  clearHideTimer: () => void
  startHideTimer: () => void
  showAndScheduleHide: () => void
  stopAutoHide: () => void
  onControlsEnter: () => void
  onControlsLeave: () => void
  onOutsideClick: () => void
}

export function usePlayer(): PlayerContext {
  const channel = useChannel()
  const stats = useStats()
  const storage = useStorage()

  bindViewport()

  if (!fillModeLoaded) {
    fillModeLoaded = true
    fillModeState.value = storage.read<FillMode>('fsFillMode', 'horizontal')
  }

  const zoomTransform = computed(
    () => 'translate(' + fsState.translateX + 'px, ' + fsState.translateY + 'px) scale(' + fsState.scale + ')'
  )

  const videoStyle = computed<Record<string, string>>(() => {
    const vw = viewportWidthState.value || 0
    const vh = viewportHeightState.value || 0
    const width = videoWidthState.value
    const height = videoHeightState.value
    if (!width || !height) {
      return {
        width: '100%',
        height: '100vh',
        left: '0',
        top: '0',
        objectFit: 'contain',
        transform: 'none',
        maxWidth: 'none',
        maxHeight: 'none'
      }
    }
    const ratio = width / height
    let boxWidth = vw
    let boxHeight = Math.round(vw / ratio)
    if (fillModeState.value === 'vertical') {
      boxHeight = vh
      boxWidth = Math.round(vh * ratio)
    }
    return {
      width: boxWidth + 'px',
      height: boxHeight + 'px',
      left: Math.round((vw - boxWidth) / 2) + 'px',
      top: Math.round((vh - boxHeight) / 2) + 'px',
      objectFit: 'contain',
      transform: 'none',
      maxWidth: 'none',
      maxHeight: 'none'
    }
  })

  function syncPlayButton(): void {
    uiState.playing = Boolean(mediaElementState.value && !mediaElementState.value.paused)
  }

  function syncMuteIcon(): void {
    const el = mediaElementState.value
    if (!el) return
    uiState.muted = el.muted || el.volume === 0
    uiState.volume = el.volume
  }

  function syncProgress(): void {
    const el = mediaElementState.value
    if (!el) return
    const duration = el.duration
    if (duration > 0) {
      uiState.progress = (el.currentTime / duration) * 100
      uiState.timeText = formatTime(el.currentTime) + ' / ' + formatTime(duration)
    }
  }

  function openFullscreen(id: number): void {
    const config = channel.config.value
    const mode = (config.mediaType || 'img') as MediaType

    /* 图片: 打开全屏即记录浏览 */
    if (mode === 'img' && !stats.isViewCooldown(id, VIEW_COOLDOWN_IMG)) {
      stats.recordView(id)
    }

    fsState.id = id
    fsState.startTime = mode === 'img' ? 0 : (cardMedia.get(id)?.currentTime || 0)
    fsState.mode = mode
    fsState.scale = 1
    fsState.translateX = 0
    fsState.translateY = 0
    fsState.dragging = false
    videoWidthState.value = 0
    videoHeightState.value = 0
    uiState.progress = 0
    uiState.buffered = 0
    uiState.timeText = '0:00 / 0:00'
    uiState.playing = false
    fsState.open = true

    if (mode === 'video' || mode === 'audio') {
      showAndScheduleHide()
    } else {
      uiState.controlsVisible = false
    }
  }

  function closeFullscreen(): void {
    const el = mediaElementState.value
    const card = cardMedia.get(fsState.id)
    if (el && card && fsState.mode !== 'img') {
      /* 还原卡片内播放进度 */
      try {
        card.currentTime = el.currentTime
      } catch {
        /* 元数据未就绪时忽略 */
      }
      card.pause()
    }
    if (el) el.pause()
    stopAutoHide()
    fsState.open = false
    fsState.id = 0
    fsState.mode = null
    fsState.scale = 1
    fsState.translateX = 0
    fsState.translateY = 0
    fsState.dragging = false
    fsState.startTime = 0
    uiState.progress = 0
    uiState.buffered = 0
    uiState.timeText = '0:00 / 0:00'
    uiState.playing = false
    videoWidthState.value = 0
    videoHeightState.value = 0
  }

  function registerMedia(el: HTMLMediaElement | null): void {
    mediaElementState.value = el
    if (!el) return
    syncPlayButton()
    syncMuteIcon()
    uiState.speed = el.playbackRate || 1
  }

  function registerCardMedia(id: number, el: HTMLMediaElement | null): void {
    if (el) cardMedia.set(id, el)
    else cardMedia.delete(id)
  }

  function getCardCurrentTime(id: number): number {
    const el = cardMedia.get(id)
    return el ? el.currentTime : 0
  }

  function unregisterCardMedia(id: number): void {
    cardMedia.delete(id)
  }

  function togglePlay(): void {
    const el = mediaElementState.value
    if (!el) return
    if (el.paused) void el.play().catch(() => undefined)
    else el.pause()
  }

  function seekToRatio(ratio: number): void {
    const el = mediaElementState.value
    if (!el || !el.duration) return
    const next = Math.max(0, Math.min(1, ratio))
    el.currentTime = next * el.duration
    uiState.progress = next * 100
    uiState.timeText = formatTime(el.currentTime) + ' / ' + formatTime(el.duration)
  }

  function seekByPointer(clientX: number, left: number, width: number): void {
    if (width <= 0) return
    seekToRatio((clientX - left) / width)
  }

  function toggleMute(): void {
    const el = mediaElementState.value
    if (!el) return
    el.muted = !el.muted
    syncMuteIcon()
  }

  function setVolume(value: number): void {
    const el = mediaElementState.value
    if (!el) return
    const next = Math.max(0, Math.min(1, value))
    el.volume = next
    el.muted = next === 0
    syncMuteIcon()
  }

  function setSpeed(value: number): void {
    const el = mediaElementState.value
    if (!el) return
    el.playbackRate = value
    uiState.speed = value
  }

  function applyFillMode(mode?: FillMode): void {
    const vw = viewportWidthState.value
    const vh = viewportHeightState.value
    const cacheKey = vw + '×' + vh

    if (mode) {
      fillModeState.value = mode
    } else if (videoWidthState.value && videoHeightState.value) {
      const perVideo = fillCache.get(fsState.id)
      const cached = perVideo ? perVideo.get(cacheKey) : undefined
      if (cached) {
        fillModeState.value = cached
      } else {
        const ratio = videoWidthState.value / videoHeightState.value
        const heightIfHorizontal = vw / ratio
        const widthIfVertical = vh * ratio
        const horizontalCovers = heightIfHorizontal >= vh
        const verticalCovers = widthIfVertical >= vw
        let next: FillMode
        if (horizontalCovers && !verticalCovers) next = 'horizontal'
        else if (verticalCovers && !horizontalCovers) next = 'vertical'
        else next = heightIfHorizontal - vh <= widthIfVertical - vw ? 'horizontal' : 'vertical'
        fillModeState.value = next
        if (!perVideo) fillCache.set(fsState.id, new Map<string, FillMode>())
        fillCache.get(fsState.id)?.set(cacheKey, next)
      }
    }
    storage.write('fsFillMode', fillModeState.value)
  }

  function toggleFillMode(): void {
    applyFillMode(fillModeState.value === 'horizontal' ? 'vertical' : 'horizontal')
    showAndScheduleHide()
  }

  function zoomIn(): void {
    fsState.scale = Math.min(fsState.scale * ZOOM_STEP, ZOOM_MAX)
  }

  function zoomOut(): void {
    fsState.scale = Math.max(fsState.scale / ZOOM_STEP, ZOOM_MIN)
  }

  function zoomReset(): void {
    fsState.scale = 1
    fsState.translateX = 0
    fsState.translateY = 0
  }

  function startDrag(clientX: number, clientY: number): void {
    if (fsState.mode !== 'img' || fsState.scale <= 1) return
    fsState.dragging = true
    dragStartX = clientX - fsState.translateX
    dragStartY = clientY - fsState.translateY
  }

  function moveDrag(clientX: number, clientY: number): void {
    if (!fsState.dragging) return
    fsState.translateX = clientX - dragStartX
    fsState.translateY = clientY - dragStartY
  }

  function endDrag(): void {
    fsState.dragging = false
  }

  function onLoadedMetadata(): void {
    const el = mediaElementState.value
    if (!el) return
    if (el instanceof HTMLVideoElement) {
      videoWidthState.value = el.videoWidth
      videoHeightState.value = el.videoHeight
      applyFillMode()
    }
    uiState.timeText = '0:00 / ' + formatTime(el.duration)
    syncMuteIcon()
  }

  function onTimeUpdate(): void {
    syncProgress()
  }

  function onProgress(): void {
    const el = mediaElementState.value
    if (!el) return
    const buffered = el.buffered
    const duration = el.duration
    if (buffered.length > 0 && duration > 0) {
      uiState.buffered = (buffered.end(buffered.length - 1) / duration) * 100
    }
  }

  function onPlay(): void {
    const el = mediaElementState.value
    uiState.playing = true
    showAndScheduleHide()
    /* 从头播放计入一次浏览 */
    if (el && fsState.id && el.currentTime < 1 && !stats.isViewCooldown(fsState.id, VIEW_COOLDOWN_MEDIA)) {
      stats.recordView(fsState.id)
    }
  }

  function onPause(): void {
    uiState.playing = false
    clearHideTimer()
    showControls()
  }

  function onEnded(): void {
    uiState.playing = false
    clearHideTimer()
    showControls()
  }

  function showControls(): void {
    uiState.controlsVisible = true
  }

  function hideControls(): void {
    const el = mediaElementState.value
    if (!el || el.paused) return
    uiState.controlsVisible = false
  }

  function clearHideTimer(): void {
    if (hideTimer) {
      clearTimeout(hideTimer)
      hideTimer = null
    }
  }

  function startHideTimer(): void {
    clearHideTimer()
    const el = mediaElementState.value
    if (el && !el.paused && !mouseOverControls) {
      hideTimer = setTimeout(hideControls, PLAYER_HIDE_DELAY)
    }
  }

  function showAndScheduleHide(): void {
    showControls()
    startHideTimer()
  }

  function stopAutoHide(): void {
    clearHideTimer()
    mouseOverControls = false
    uiState.controlsVisible = false
  }

  function onControlsEnter(): void {
    mouseOverControls = true
    clearHideTimer()
  }

  function onControlsLeave(): void {
    mouseOverControls = false
    startHideTimer()
  }

  function onOutsideClick(): void {
    clearHideTimer()
    hideControls()
  }

  return {
    fs: fsState,
    ui: uiState,
    fillMode: fillModeState,
    mediaElement: mediaElementState,
    zoomTransform,
    videoStyle,
    openFullscreen,
    closeFullscreen,
    registerMedia,
    registerCardMedia,
    unregisterCardMedia,
    getCardCurrentTime,
    togglePlay,
    seekToRatio,
    seekByPointer,
    toggleMute,
    setVolume,
    setSpeed,
    applyFillMode,
    toggleFillMode,
    zoomIn,
    zoomOut,
    zoomReset,
    startDrag,
    moveDrag,
    endDrag,
    onLoadedMetadata,
    onTimeUpdate,
    onProgress,
    onPlay,
    onPause,
    onEnded,
    showControls,
    hideControls,
    clearHideTimer,
    startHideTimer,
    showAndScheduleHide,
    stopAutoHide,
    onControlsEnter,
    onControlsLeave,
    onOutsideClick
  }
}
