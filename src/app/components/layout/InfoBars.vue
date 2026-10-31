<template>
  <div id="announcementBar" class="info-bar announcement-bar" v-html="announcement"></div>
  <div id="descriptionBar" class="info-bar description-bar">{{ description }}</div>
</template>

<script setup lang="ts">
defineProps<{
  /* 频道公告, 含 HTML */
  announcement: string
  /* 当前 Tab 的说明文案 */
  description: string
}>()
</script>
