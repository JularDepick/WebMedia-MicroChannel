<template>
  <div
    id="playerControls"
    class="player-controls"
    :class="{ visible: player.ui.controlsVisible }"
    @click.stop
    @mouseenter="player.onControlsEnter()"
    @mouseleave="player.onControlsLeave()"
  >
    <button
      id="playerPlayPause"
      class="player-btn player-play-btn"
      :class="{ playing: player.ui.playing }"
      title="播放/暂停"
      @click.stop="player.togglePlay()"
    >
      <span v-if="player.ui.playing">&#10074;&#10074;</span>
      <span v-else>&#9654;</span>
    </button>

    <div
      id="playerProgressWrap"
      ref="progressWrapEl"
      class="player-progress-wrap"
      @click.stop="onProgressClick"
      @mousedown.prevent.stop="onProgressDown"
    >
      <div id="playerBuffered" class="player-buffered" :style="{ width: player.ui.buffered + '%' }"></div>
      <div id="playerProgress" class="player-progress" :style="{ width: player.ui.progress + '%' }"></div>
    </div>

    <span id="playerTime" class="player-time">{{ player.ui.timeText }}</span>

    <div class="player-volume-wrap" @wheel.prevent.stop="onVolumeWheel">
      <button id="playerMute" class="player-btn player-mute-btn" title="静音" @click.stop="player.toggleMute()">
        <span v-if="muteLevel === 0">&#128263;</span>
        <span v-else-if="muteLevel === 1">&#128265;</span>
        <span v-else>&#128266;</span>
      </button>
      <input
        id="playerVolume"
        type="range"
        class="player-volume"
        min="0"
        max="1"
        step="0.05"
        :value="player.ui.volume"
        @input="onVolumeInput"
        @change="onVolumeInput"
        @click.stop
      />
    </div>

    <select
      id="playerSpeed"
      class="player-speed"
      title="播放速度"
      :value="String(player.ui.speed)"
      @change="onSpeedChange"
      @click.stop
    >
      <option v-for="speed in SPEEDS" :key="speed" :value="String(speed)">{{ speed }}x</option>
    </select>

    <button
      id="playerFill"
      class="player-btn player-fill-btn"
      :title="fillTitle"
      @click.stop="player.toggleFillMode()"
    >
      <span v-if="player.fillMode.value === 'horizontal'">&#8596;</span>
      <span v-else>&#8597;</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { usePlayer } from '~/composables/usePlayer'

/* 可选播放速度 */
const SPEEDS = [0.5, 0.8, 1, 1.5, 2, 3]
/* 音量滚轮步进 */
const VOLUME_STEP = 0.1

const player = usePlayer()
const progressWrapEl = ref<HTMLElement | null>(null)

let dragging = false

const muteLevel = computed(() => {
  if (player.ui.muted || player.ui.volume === 0) return 0
  return player.ui.volume < 0.5 ? 1 : 2
})

const fillTitle = computed(() =>
  player.fillMode.value === 'horizontal' ? '横向填充(点击切换)' : '纵向填充(点击切换)'
)

function seekByEvent(event: MouseEvent): void {
  const wrap = progressWrapEl.value
  if (!wrap) return
  const rect = wrap.getBoundingClientRect()
  player.seekByPointer(event.clientX, rect.left, rect.width)
}

function onProgressClick(event: MouseEvent): void {
  seekByEvent(event)
}

function onProgressDown(event: MouseEvent): void {
  dragging = true
  seekByEvent(event)
  document.addEventListener('mousemove', onProgressMove)
  document.addEventListener('mouseup', onProgressUp)
}

function onProgressMove(event: MouseEvent): void {
  if (!dragging) return
  seekByEvent(event)
}

function onProgressUp(): void {
  dragging = false
  document.removeEventListener('mousemove', onProgressMove)
  document.removeEventListener('mouseup', onProgressUp)
}

function onVolumeInput(event: Event): void {
  const target = event.target as HTMLInputElement
  player.setVolume(Number.parseFloat(target.value))
}

function onVolumeWheel(event: WheelEvent): void {
  const delta = event.deltaY > 0 ? -VOLUME_STEP : VOLUME_STEP
  const next = Math.max(0, Math.min(1, player.ui.volume + delta))
  player.setVolume(next)
}

function onSpeedChange(event: Event): void {
  const target = event.target as HTMLSelectElement
  player.setSpeed(Number.parseFloat(target.value))
}

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onProgressMove)
  document.removeEventListener('mouseup', onProgressUp)
})
</script>
