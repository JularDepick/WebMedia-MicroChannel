<template>
  <div
    id="fullscreenModal"
    ref="modalEl"
    class="fullscreen-modal"
    :class="{ open: player.fs.open, 'video-mode': isVideoMode }"
    @click="onModalClick"
    @wheel="onWheel"
    @touchstart.passive="onTouchStart"
    @touchmove="onTouchMove"
    @mousemove="onMouseMove"
  >
    <button
      id="fullscreenClose"
      class="fullscreen-close"
      title="关闭"
      :style="{ display: closeVisible ? '' : 'none' }"
      @click.stop="onClose"
    >&times;</button>

    <div id="zoomControls" class="fullscreen-controls" :style="{ display: zoomVisible ? '' : 'none' }">
      <button id="zoomIn" class="fs-ctrl-btn" title="放大" @click.stop="player.zoomIn()">+</button>
      <button id="zoomOut" class="fs-ctrl-btn" title="缩小" @click.stop="player.zoomOut()">&minus;</button>
      <button id="zoomReset" class="fs-ctrl-btn" title="重置" @click.stop="player.zoomReset()">1:1</button>
    </div>

    <div class="fullscreen-media-wrap">
      <img
        v-if="isImageMode"
        id="fullscreenMedia"
        class="fullscreen-media"
        :class="{ grabbing: player.fs.dragging }"
        :style="imageStyle"
        :src="fullscreenSrc"
        alt=""
        @mousedown.prevent="onImageMouseDown"
      />
      <video
        v-if="isVideoMode"
        ref="videoEl"
        class="fullscreen-media"
        :style="player.videoStyle.value"
        :src="fullscreenSrc"
        preload="metadata"
        playsinline
        @loadedmetadata="onVideoLoaded"
        @timeupdate="player.onTimeUpdate()"
        @progress="player.onProgress()"
        @play="player.onPlay()"
        @pause="player.onPause()"
        @ended="player.onEnded()"
      ></video>
      <audio
        v-if="isAudioMode"
        id="fullscreenAudio"
        ref="audioEl"
        class="fullscreen-media fullscreen-audio"
        :src="fullscreenSrc"
        preload="metadata"
        @loadedmetadata="onAudioLoaded"
        @timeupdate="player.onTimeUpdate()"
        @progress="player.onProgress()"
        @play="player.onPlay()"
        @pause="player.onPause()"
        @ended="player.onEnded()"
      ></audio>
    </div>

    <MediaPlayer />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { mediaPath } from '~/utils/format'
import MediaPlayer from '~/components/media/MediaPlayer.vue'
import { useChannel } from '~/composables/useChannel'
import { usePlayer } from '~/composables/usePlayer'

/* 视频单击与双击判定窗口(ms) */
const SINGLE_CLICK_DELAY = 280
/* 缩放上下限 */
const ZOOM_MAX = 10
const ZOOM_MIN = 0.2

const channel = useChannel()
const player = usePlayer()

const modalEl = ref<HTMLElement | null>(null)
const videoEl = ref<HTMLVideoElement | null>(null)
const audioEl = ref<HTMLAudioElement | null>(null)

let clickTimer: ReturnType<typeof setTimeout> | null = null
let dragging = false
let lastTouchDistance = 0
let fullscreenTransitionLock = false

const isImageMode = computed(() => player.fs.open && player.fs.mode === 'img')
const isVideoMode = computed(() => player.fs.open && player.fs.mode === 'video')
const isAudioMode = computed(() => player.fs.open && player.fs.mode === 'audio')
const fullscreenSrc = computed(() => (player.fs.open ? mediaPath(channel.config.value, player.fs.id) : ''))
const zoomVisible = computed(() => isImageMode.value)
const closeVisible = computed(() => (isVideoMode.value || isAudioMode.value ? player.ui.controlsVisible : true))
const imageStyle = computed(() => ({ transform: player.zoomTransform.value }))

function onClose(): void {
  player.closeFullscreen()
}

function onVideoLoaded(): void {
  const el = videoEl.value
  if (!el) return
  if (player.fs.startTime > 0) {
    try {
      el.currentTime = player.fs.startTime
    } catch {
      /* 元数据未就绪时忽略 */
    }
  }
  player.registerMedia(el)
  player.onLoadedMetadata()
  void el.play().catch(() => undefined)
}

function onAudioLoaded(): void {
  const el = audioEl.value
  if (!el) return
  if (player.fs.startTime > 0) {
    try {
      el.currentTime = player.fs.startTime
    } catch {
      /* 元数据未就绪时忽略 */
    }
  }
  player.registerMedia(el)
  player.onLoadedMetadata()
}

function handleVideoClick(): void {
  if (clickTimer) {
    clearTimeout(clickTimer)
    clickTimer = null
    player.togglePlay()
    return
  }
  clickTimer = setTimeout(() => {
    clickTimer = null
    if (player.ui.controlsVisible) player.onOutsideClick()
    else player.showAndScheduleHide()
  }, SINGLE_CLICK_DELAY)
}

function onModalClick(event: MouseEvent): void {
  const target = event.target as HTMLElement | null
  if (!target) return
  if (isVideoMode.value) {
    if (target !== videoEl.value && !target.classList.contains('fullscreen-media-wrap') && target !== modalEl.value) return
    handleVideoClick()
    return
  }
  if (isImageMode.value) {
    if (target === modalEl.value || target.classList.contains('fullscreen-media-wrap')) player.closeFullscreen()
  }
}

function onWheel(event: WheelEvent): void {
  if (!player.fs.open || player.fs.mode !== 'img') return
  event.preventDefault()
  if (event.deltaY < 0) player.zoomIn()
  else player.zoomOut()
}

function onImageMouseDown(event: MouseEvent): void {
  if (!isImageMode.value || player.fs.scale <= 1) return
  dragging = true
  player.startDrag(event.clientX, event.clientY)
}

function onDocumentMouseMove(event: MouseEvent): void {
  if (!dragging) return
  player.moveDrag(event.clientX, event.clientY)
}

function onDocumentMouseUp(): void {
  if (!dragging) return
  dragging = false
  player.endDrag()
}

function onTouchStart(event: TouchEvent): void {
  if (isVideoMode.value || isAudioMode.value) player.showAndScheduleHide()
  if (!isImageMode.value) return
  if (event.touches.length === 2) {
    lastTouchDistance = Math.hypot(
      event.touches[0].clientX - event.touches[1].clientX,
      event.touches[0].clientY - event.touches[1].clientY
    )
  }
}

function onTouchMove(event: TouchEvent): void {
  if (!isImageMode.value) return
  if (event.touches.length !== 2) return
  event.preventDefault()
  const distance = Math.hypot(
    event.touches[0].clientX - event.touches[1].clientX,
    event.touches[0].clientY - event.touches[1].clientY
  )
  if (lastTouchDistance > 0) {
    const ratio = distance / lastTouchDistance
    player.fs.scale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, player.fs.scale * ratio))
  }
  lastTouchDistance = distance
}

function onMouseMove(event: MouseEvent): void {
  if (!isVideoMode.value && !isAudioMode.value) return
  if (!player.ui.controlsVisible && event.clientY > window.innerHeight - 80) player.showAndScheduleHide()
}

function onKeydown(event: KeyboardEvent): void {
  if (!player.fs.open) return
  if (event.key === 'Escape') {
    player.closeFullscreen()
    return
  }
  if (event.key === ' ' || event.code === 'Space') {
    if (player.fs.mode !== 'video' && player.fs.mode !== 'audio') return
    event.preventDefault()
    player.togglePlay()
  }
}

function onResize(): void {
  if (fullscreenTransitionLock) return
  if (!player.fs.open || player.fs.mode !== 'video') return
  player.applyFillMode(player.fillMode.value)
}

function onFullscreenChange(): void {
  if (!player.fs.open || player.fs.mode !== 'video') return
  fullscreenTransitionLock = true
  setTimeout(() => {
    fullscreenTransitionLock = false
    player.applyFillMode()
  }, 300)
}

watch(isVideoMode, (active) => {
  if (!active) {
    player.registerMedia(null)
    return
  }
  void nextTick(() => {
    if (videoEl.value) player.registerMedia(videoEl.value)
  })
})

watch(isAudioMode, (active) => {
  if (!active) {
    player.registerMedia(null)
    return
  }
  void nextTick(() => {
    if (audioEl.value) player.registerMedia(audioEl.value)
  })
})

watch(
  () => player.fs.open,
  (open) => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = open ? 'hidden' : ''
    if (!open) {
      player.registerMedia(null)
      dragging = false
      if (clickTimer) {
        clearTimeout(clickTimer)
        clickTimer = null
      }
    }
  }
)

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  document.addEventListener('mousemove', onDocumentMouseMove)
  document.addEventListener('mouseup', onDocumentMouseUp)
  window.addEventListener('resize', onResize, { passive: true })
  document.addEventListener('fullscreenchange', onFullscreenChange)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('mousemove', onDocumentMouseMove)
  document.removeEventListener('mouseup', onDocumentMouseUp)
  window.removeEventListener('resize', onResize)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  if (clickTimer) clearTimeout(clickTimer)
  if (typeof document !== 'undefined') document.body.style.overflow = ''
})

defineExpose({ onClose })
</script>
