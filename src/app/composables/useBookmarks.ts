/* ============================================================
   书签
   按频道与 Tab 隔离存储, 提供新增、重命名、删除、清空、跳转、
   折叠与拖拽位置更新
   ============================================================ */

import { ref, type Ref } from 'vue'
import { useChannel } from './useChannel'
import { useStorage } from './useStorage'

export interface BookmarkTag {
  id: string
  name: string
  /* 相对页面顶部的文档坐标 */
  scrollY: number
}

const tagsState = ref<BookmarkTag[]>([])
const expandedIdState = ref<string | null>(null)
const currentTabState = ref('home')
let loadedTab = ''

export interface BookmarksContext {
  tags: Ref<BookmarkTag[]>
  expandedId: Ref<string | null>
  /* 切换 Tab 后重新载入该 Tab 的书签 */
  setTab: (tab: string) => void
  /* 读取当前 Tab 书签 */
  getTags: () => BookmarkTag[]
  /* 新增书签 */
  addTag: (scrollY: number) => BookmarkTag
  /* 重命名书签 */
  renameTag: (id: string, name: string) => void
  /* 删除书签 */
  deleteTag: (id: string) => void
  /* 清空当前 Tab 书签 */
  clearAll: () => void
  /* 更新书签的文档坐标 */
  setTagScroll: (id: string, scrollY: number) => void
  /* 展开指定书签, 其余收起 */
  expandTag: (id: string) => void
  /* 收起全部书签 */
  collapseAll: () => void
  /* 按方向跳转到上/下一个书签 */
  jumpToTag: (direction: 'prev' | 'next') => number | null
  /* 书签是否可用(探索与标签页不可用) */
  isEnabled: (tab: string) => boolean
}

export function useBookmarks(): BookmarksContext {
  const storage = useStorage()
  const channel = useChannel()

  function tagKey(tab: string): string {
    return 'cfg_' + channel.config.value.id + '_tags_' + tab
  }

  function readTags(tab: string): BookmarkTag[] {
    const tags = storage.read<BookmarkTag[]>(tagKey(tab), [])
    return Array.isArray(tags) ? tags : []
  }

  function writeTags(tab: string, tags: BookmarkTag[]): void {
    storage.write(tagKey(tab), tags)
  }

  function setTab(tab: string): void {
    currentTabState.value = tab
    if (loadedTab === tab) return
    loadedTab = tab
    tagsState.value = readTags(tab)
    expandedIdState.value = null
  }

  function getTags(): BookmarkTag[] {
    if (loadedTab !== currentTabState.value) setTab(currentTabState.value)
    return tagsState.value
  }

  function persist(): void {
    writeTags(currentTabState.value, tagsState.value.map((tag) => ({ ...tag })))
  }

  function nextIndex(): number {
    const prefix = '书签'
    let max = 0
    getTags().forEach((tag) => {
      if (!tag.name.startsWith(prefix)) return
      const value = Number.parseInt(tag.name.slice(prefix.length), 10)
      if (!Number.isNaN(value) && value > max) max = value
    })
    return max + 1
  }

  function addTag(scrollY: number): BookmarkTag {
    const tag: BookmarkTag = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: '书签' + nextIndex(),
      scrollY: Math.max(0, Math.round(scrollY))
    }
    tagsState.value = [...tagsState.value, tag]
    persist()
    return tag
  }

  function renameTag(id: string, name: string): void {
    const value = name.trim()
    if (!value) return
    tagsState.value = tagsState.value.map((tag) => (tag.id === id ? { ...tag, name: value } : tag))
    persist()
  }

  function deleteTag(id: string): void {
    tagsState.value = tagsState.value.filter((tag) => tag.id !== id)
    if (expandedIdState.value === id) expandedIdState.value = null
    persist()
  }

  function clearAll(): void {
    tagsState.value = []
    expandedIdState.value = null
    persist()
  }

  function setTagScroll(id: string, scrollY: number): void {
    tagsState.value = tagsState.value.map((tag) =>
      tag.id === id ? { ...tag, scrollY: Math.max(0, Math.round(scrollY)) } : tag
    )
    persist()
  }

  function expandTag(id: string): void {
    expandedIdState.value = expandedIdState.value === id ? null : id
  }

  function collapseAll(): void {
    expandedIdState.value = null
  }

  function jumpToTag(direction: 'prev' | 'next'): number | null {
    const tags = getTags()
    if (tags.length === 0) return null
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0
    if (direction === 'prev') {
      for (let i = tags.length - 1; i >= 0; i--) {
        if (tags[i].scrollY < scrollY - 10) return tags[i].scrollY
      }
      return null
    }
    for (let i = 0; i < tags.length; i++) {
      if (tags[i].scrollY > scrollY + 10) return tags[i].scrollY
    }
    return null
  }

  function isEnabled(tab: string): boolean {
    return tab !== 'explore' && tab !== 'labeled'
  }

  return {
    tags: tagsState,
    expandedId: expandedIdState,
    setTab,
    getTags,
    addTag,
    renameTag,
    deleteTag,
    clearAll,
    setTagScroll,
    expandTag,
    collapseAll,
    jumpToTag,
    isEnabled
  }
}
