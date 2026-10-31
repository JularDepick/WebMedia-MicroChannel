<template>
  <div
    ref="cardEl"
    class="media-card"
    :class="{ 'card-blocked': showBlocked, 'card-disabled': disabled }"
    :data-id="id"
    :style="removingStyle"
  >
    <div v-if="labels.length > 0" class="card-label-banner">
      <span v-for="label in labels" :key="label" class="card-label-tag">{{ label }}</span>
    </div>

    <div
      ref="mediaWrapEl"
      class="card-media-wrap"
      :class="{ 'media-loaded': mediaLoaded }"
      :title="fileName"
    >
      <img
        v-if="isImage"
        ref="imgEl"
        class="card-media"
        :class="{ loading: !imgLoaded, loaded: imgLoaded }"
        alt=""
        loading="lazy"
        :data-src="src"
        @load="onImageLoad"
        @error="onImageError"
      />
      <video
        v-else-if="isVideo"
        ref="mediaEl"
        class="card-media loaded"
        preload="metadata"
        playsinline
        :controls="false"
        :src="src"
        @loadedmetadata="onMediaLoaded"
        @error="onMediaError"
        @play="onCardPlay"
        @pause="onCardPause"
        @ended="onCardEnded"
        @timeupdate="onCardTimeUpdate"
        @progress="onCardProgress"
        @click.stop="toggleCardPlay"
      ></video>
      <audio
        v-else
        ref="mediaEl"
        class="card-media loaded"
        preload="metadata"
        :controls="false"
        :src="src"
        @loadedmetadata="onMediaLoaded"
        @error="onMediaError"
        @play="onCardPlay"
        @pause="onCardPause"
        @ended="onCardEnded"
        @timeupdate="onCardTimeUpdate"
        @progress="onCardProgress"
        @click.stop="toggleCardPlay"
      ></audio>

      <template v-if="isPlayable">
        <div
          class="card-play-overlay"
          title="播放"
          :style="{ display: overlayVisible ? '' : 'none' }"
          @click.stop="toggleCardPlay"
        >&#9654;</div>
        <div
          class="card-player-bar"
          :class="{ visible: barVisible }"
          @wheel.prevent.stop="onBarWheel"
        >
          <button class="card-ctrl-play" title="播放" @click.stop="toggleCardPlay">
            <span v-if="playing">&#10074;&#10074;</span>
            <span v-else>&#9654;</span>
          </button>
          <div
            class="card-ctrl-progress-wrap"
            @click.stop="seekCard"
            @mousedown.stop="startSeek"
          >
            <div class="card-ctrl-buffered" :style="{ width: bufferedPercent + '%' }"></div>
            <div class="card-ctrl-progress" :style="{ width: progressPercent + '%' }"></div>
          </div>
          <span class="card-ctrl-time">{{ timeText }}</span>
          <button class="card-ctrl-mute" title="静音" @click.stop="toggleCardMute">
            <span v-if="muteLevel === 0">&#128263;</span>
            <span v-else-if="muteLevel === 1">&#128265;</span>
            <span v-else>&#128266;</span>
          </button>
        </div>
      </template>
    </div>

    <div class="control-bar">
      <button class="ctrl-btn ctrl-btn-static" title="浏览量">
        <span class="ctrl-icon">&#128065;</span>
        <span class="ctrl-count">{{ formatCount(viewCount) }}</span>
      </button>
      <button
        class="ctrl-btn"
        :class="{ 'active-like': liked }"
        :title="liked ? '已赞' : '点赞'"
        data-action="like"
        @click.stop="onLike"
      >
        <span class="ctrl-icon">&#9829;</span>
        <span class="ctrl-count">{{ formatCount(likeCount) }}</span>
      </button>
      <button
        class="ctrl-btn"
        :class="{ 'active-fav': favorited }"
        :title="favorited ? '收藏' : '取消收藏'"
        data-action="favorite"
        @click.stop="onFavorite"
      >
        <span class="ctrl-icon">&#9733;</span>
        <span class="ctrl-count">{{ formatCount(favoriteCount) }}</span>
      </button>
      <button class="ctrl-btn" title="全屏" @click.stop="onFullscreen">
        <span class="ctrl-icon">&#9974;</span>
      </button>
      <button class="ctrl-btn" title="下载" data-action="download" @click.stop="onDownload">
        <span class="ctrl-icon">&#8615;</span>
        <span class="ctrl-count">{{ formatCount(downloadCount) }}</span>
      </button>
      <button class="ctrl-btn" title="分享" data-action="share" @click.stop="onShare">
        <span class="ctrl-icon">&#128279;</span>
        <span class="ctrl-count">{{ formatCount(shareCount) }}</span>
      </button>
      <button
        class="ctrl-btn"
        :class="{ 'confirm-state': blockConfirming }"
        :title="blockTitle"
        data-action="block"
        @click.stop="onBlock"
      >
        <span class="ctrl-icon">
          <template v-if="blockRestorable">&#8617;</template>
          <template v-else>&#128683;</template>
        </span>
        <span class="ctrl-count">{{ formatCount(blockCount) }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { TabKey } from '~~/shared/types/channel'
import { formatCount, mediaFileName, mediaPath } from '~/utils/format'
import { useChannel } from '~/composables/useChannel'
import { useMediaLayout } from '~/composables/useMediaLayout'
import { usePlayer } from '~/composables/usePlayer'
import { useStats } from '~/composables/useStats'
import { useToast } from '~/composables/useToast'

/* 二次确认回退时长(ms) */
const CONFIRM_TIMEOUT = 3000
/* 移除动画时长(ms) */
const REMOVE_ANIMATION = 300
/* 音量滚轮步进 */
const VOLUME_STEP = 0.1

const props = defineProps<{
  id: number
  tab: TabKey
}>()

const emit = defineEmits<{
  (event: 'remove', id: number): void
}>()

const channel = useChannel()
const stats = useStats()
const layout = useMediaLayout()
const player = usePlayer()
const { showToast } = useToast()

const cardEl = ref<HTMLElement | null>(null)
const mediaWrapEl = ref<HTMLElement | null>(null)
const imgEl = ref<HTMLImageElement | null>(null)
const mediaEl = ref<HTMLMediaElement | null>(null)

const imgLoaded = ref(false)
const mediaLoaded = ref(false)
const disabled = ref(false)
const removing = ref(false)
const playing = ref(false)
const barVisible = ref(false)
const progressPercent = ref(0)
const bufferedPercent = ref(0)
const timeText = ref('0:00')
const muted = ref(false)
const volume = ref(1)
const blockConfirming = ref(false)

let imageObserver: IntersectionObserver | null = null
let imageRetryTimer: ReturnType<typeof setTimeout> | null = null
let imageRetryCount = 0
let confirmTimer: ReturnType<typeof setTimeout> | null = null
let removeTimer: ReturnType<typeof setTimeout> | null = null
let seeking = false

const config = channel.config
const mediaType = computed(() => config.value.mediaType)
const isImage = computed(() => mediaType.value === 'img')
const isVideo = computed(() => mediaType.value === 'video')
const isPlayable = computed(() => mediaType.value === 'video' || mediaType.value === 'audio')
const src = computed(() => mediaPath(config.value, props.id))
const fileName = computed(() => mediaFileName(config.value, props.id))
const labels = computed(() => stats.getLabelsForMedia(props.id))

const liked = computed(() => stats.isLiked(props.id))
const favorited = computed(() => stats.isFavorited(props.id))
const blocked = computed(() => stats.isBlocked(props.id))
const viewCount = computed(() => stats.getCount('hot', props.id))
const likeCount = computed(() => stats.getCount('topliked', props.id))
const favoriteCount = computed(() => stats.getCount('featured', props.id))
const downloadCount = computed(() => stats.getCount('downloads', props.id))
const shareCount = computed(() => stats.getCount('shares', props.id))
const blockCount = computed(() => stats.getCount('blocks', props.id))

const showBlocked = computed(() => props.tab === 'sensitive' && blocked.value)
const blockRestorable = computed(() => showBlocked.value)
const blockTitle = computed(() => {
  if (blockConfirming.value) return blockRestorable.value ? '确认取消屏蔽？' : '确认屏蔽？'
  return blockRestorable.value ? '取消屏蔽' : '屏蔽'
})

const isFullscreenSelf = computed(() => player.fs.open && player.fs.id === props.id)
const overlayVisible = computed(() => !isFullscreenSelf.value && !playing.value)
const muteLevel = computed(() => {
  if (muted.value || volume.value === 0) return 0
  return volume.value < 0.5 ? 1 : 2
})
const removingStyle = computed(() =>
  removing.value
    ? { opacity: '0', transform: 'scale(0.9)', transition: 'opacity 0.3s, transform 0.3s' }
    : undefined
)

function cacheHeight(): void {
  const el = cardEl.value
  if (!el) return
  el.dataset.h = String(el.offsetHeight)
  layout.markHeightReady(props.id)
}

function markLoaded(): void {
  mediaLoaded.value = true
}

function onImageLoad(): void {
  if (channel.cancelled.value) return
  imgLoaded.value = true
  markLoaded()
  cacheHeight()
}

function onImageError(): void {
  if (channel.cancelled.value) return
  imgLoaded.value = true
  markLoaded()
  cacheHeight()
  disableCard()
}

function onMediaLoaded(): void {
  if (channel.cancelled.value) return
  markLoaded()
  cacheHeight()
  const el = mediaEl.value
  if (el) {
    timeText.value = '0:00 / ' + formatTime(el.duration)
    muted.value = el.muted
    volume.value = el.volume
  }
}

function onMediaError(): void {
  if (channel.cancelled.value) return
  markLoaded()
  cacheHeight()
  disableCard()
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const rest = Math.floor(seconds % 60)
  return minutes + ':' + (rest < 10 ? '0' : '') + rest
}

function disableCard(): void {
  disabled.value = true
}

function loadImage(): void {
  const img = imgEl.value
  if (!img || img.src) return
  img.removeAttribute('loading')
  img.src = src.value
  if (imageObserver) {
    imageObserver.disconnect()
    imageObserver = null
  }
}

/* 快速滚动暂停加载时轮询重试, 避免卡片长期空白 */
function tryLoadImage(): void {
  if (imageRetryTimer) {
    clearTimeout(imageRetryTimer)
    imageRetryTimer = null
  }
  if (layout.scrollPaused.value || channel.cancelled.value) {
    if (imageRetryCount >= 20) return
    imageRetryCount += 1
    imageRetryTimer = setTimeout(tryLoadImage, 150)
    return
  }
  loadImage()
}

function setupImageObserver(): void {
  const img = imgEl.value
  if (!img || typeof IntersectionObserver === 'undefined') {
    loadImage()
    return
  }
  imageObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        tryLoadImage()
        break
      }
    },
    { rootMargin: '200px' }
  )
  imageObserver.observe(img)
}

function toggleCardPlay(): void {
  const el = mediaEl.value
  if (!el) return
  if (el.paused) void el.play().catch(() => undefined)
  else el.pause()
}

function onCardPlay(): void {
  if (player.fs.id) return
  playing.value = true
  barVisible.value = true
}

function onCardPause(): void {
  if (player.fs.id) return
  const el = mediaEl.value
  if (el && el.seeking) return
  playing.value = false
  barVisible.value = false
}

function onCardEnded(): void {
  if (player.fs.id) return
  playing.value = false
  barVisible.value = false
  progressPercent.value = 0
  const el = mediaEl.value
  timeText.value = '0:00 / ' + formatTime(el ? el.duration : 0)
}

function onCardTimeUpdate(): void {
  const el = mediaEl.value
  if (!el || !el.duration) return
  progressPercent.value = (el.currentTime / el.duration) * 100
  timeText.value = formatTime(el.currentTime) + ' / ' + formatTime(el.duration)
}

function onCardProgress(): void {
  const el = mediaEl.value
  if (!el) return
  if (el.buffered.length > 0 && el.duration) {
    bufferedPercent.value = (el.buffered.end(el.buffered.length - 1) / el.duration) * 100
  }
}

function toggleCardMute(): void {
  const el = mediaEl.value
  if (!el) return
  el.muted = !el.muted
  muted.value = el.muted
}

function onBarWheel(event: WheelEvent): void {
  const el = mediaEl.value
  if (!el) return
  const delta = event.deltaY > 0 ? -VOLUME_STEP : VOLUME_STEP
  const next = Math.max(0, Math.min(1, el.volume + delta))
  el.volume = next
  el.muted = next === 0
  volume.value = next
  muted.value = el.muted
}

function seekByEvent(event: MouseEvent): void {
  const wrap = event.currentTarget as HTMLElement | null
  const el = mediaEl.value
  if (!wrap || !el || !el.duration) return
  const rect = wrap.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
  el.currentTime = ratio * el.duration
}

function seekCard(event: MouseEvent): void {
  seekByEvent(event)
}

function startSeek(event: MouseEvent): void {
  const el = mediaEl.value
  if (!el || !el.duration) return
  seeking = true
  seekByEvent(event)
  document.addEventListener('mousemove', onSeekMove)
  document.addEventListener('mouseup', onSeekEnd)
}

function onSeekMove(event: MouseEvent): void {
  if (!seeking) return
  const el = mediaEl.value
  const wrap = mediaWrapEl.value ? mediaWrapEl.value.querySelector('.card-ctrl-progress-wrap') : null
  if (!el || !wrap || !el.duration) return
  const rect = wrap.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
  el.currentTime = ratio * el.duration
}

function onSeekEnd(): void {
  seeking = false
  document.removeEventListener('mousemove', onSeekMove)
  document.removeEventListener('mouseup', onSeekEnd)
}

function onLike(): void {
  const nowLiked = stats.toggleLike(props.id)
  if (nowLiked && !stats.isLikeNotified(props.id)) {
    stats.markLikeNotified(props.id)
    stats.notifyServer('like', props.id)
  }
  stats.incrementCount('topliked', props.id, nowLiked ? 1 : -1)
}

function onFavorite(): void {
  const nowFavorited = stats.toggleFavorite(props.id)
  if (nowFavorited) {
    showToast('已收藏')
    if (!stats.isFavNotified(props.id)) {
      stats.markFavNotified(props.id)
      stats.notifyServer('favorite', props.id)
    }
  } else {
    showToast('已取消收藏')
    if (props.tab === 'favorites') animateRemove()
  }
  stats.incrementCount('featured', props.id, nowFavorited ? 1 : -1)
}

async function onShare(): Promise<void> {
  let url = src.value
  try {
    url = new URL(src.value, document.baseURI).href
  } catch {
    url = src.value
  }
  try {
    await navigator.clipboard.writeText(url)
    showToast('链接已复制到剪贴板')
  } catch {
    const area = document.createElement('textarea')
    area.value = url
    document.body.appendChild(area)
    area.select()
    document.execCommand('copy')
    document.body.removeChild(area)
    showToast('链接已复制到剪贴板')
  }
  if (!stats.isShareNotified(props.id)) {
    stats.markShareNotified(props.id)
    stats.notifyServer('share', props.id)
    stats.incrementCount('shares', props.id)
  }
}

async function onDownload(): Promise<void> {
  const url = src.value
  const name = fileName.value
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000)
  } catch {
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  if (!stats.isDownloadNotified(props.id)) {
    stats.markDownloadNotified(props.id)
    stats.notifyServer('download', props.id)
    stats.incrementCount('downloads', props.id)
  }
}

function resetBlockConfirm(): void {
  blockConfirming.value = false
  if (confirmTimer) {
    clearTimeout(confirmTimer)
    confirmTimer = null
  }
}

function applyBlock(): void {
  stats.blockMedia(props.id)
  if (!stats.isBlockNotified(props.id)) {
    stats.markBlockNotified(props.id)
    stats.notifyServer('block', props.id)
    stats.incrementCount('blocks', props.id)
  }
  if (stats.isLiked(props.id)) {
    stats.removeLike(props.id)
    stats.incrementCount('topliked', props.id, -1)
  }
  if (stats.isFavorited(props.id)) {
    stats.removeFavorite(props.id)
    stats.incrementCount('featured', props.id, -1)
  }
  showToast('已屏蔽该资源')
  if (props.tab !== 'sensitive') animateRemove()
}

function onBlock(): void {
  if (blockConfirming.value) {
    resetBlockConfirm()
    if (props.tab === 'sensitive' && stats.isBlocked(props.id)) {
      stats.unblockMedia(props.id)
      showToast('已取消屏蔽')
      return
    }
    applyBlock()
    return
  }
  blockConfirming.value = true
  if (confirmTimer) clearTimeout(confirmTimer)
  confirmTimer = setTimeout(resetBlockConfirm, CONFIRM_TIMEOUT)
}

function onDocumentClick(event: MouseEvent): void {
  if (!blockConfirming.value) return
  const target = event.target as Node | null
  if (cardEl.value && target && cardEl.value.contains(target)) return
  resetBlockConfirm()
}

function animateRemove(): void {
  removing.value = true
  if (removeTimer) clearTimeout(removeTimer)
  removeTimer = setTimeout(() => {
    emit('remove', props.id)
  }, REMOVE_ANIMATION)
}

function onFullscreen(): void {
  player.openFullscreen(props.id)
}

watch(isFullscreenSelf, (active) => {
  if (!active) return
  const el = mediaEl.value
  if (el) el.pause()
})

watch(
  () => props.tab,
  () => {
    resetBlockConfirm()
  }
)

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  if (isImage.value) setupImageObserver()
  const el = mediaEl.value
  if (el) {
    player.registerCardMedia(props.id, el)
    muted.value = el.muted
    volume.value = el.volume
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  if (imageObserver) {
    imageObserver.disconnect()
    imageObserver = null
  }
  if (imageRetryTimer) clearTimeout(imageRetryTimer)
  if (confirmTimer) clearTimeout(confirmTimer)
  if (removeTimer) clearTimeout(removeTimer)
  onSeekEnd()
  player.unregisterCardMedia(props.id)
})

defineExpose({ loadImage })
</script>
