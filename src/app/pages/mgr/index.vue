<template>
  <div class="mgr-shell">
    <!-- Toast 提示容器 -->
    <div class="toast-container" id="toastContainer">
      <div v-if="toastVisible" :class="['toast', 'toast-show', 'toast-' + toastType]">{{ toastMessage }}</div>
    </div>

    <!-- 顶部栏 -->
    <header class="admin-header" id="top">
      <h1 class="admin-title">
        频道管理 <span class="admin-subtitle">管理端</span>
      </h1>
      <div class="admin-user" id="adminUser" v-show="isLoggedIn">
        <span class="username" id="usernameDisplay">{{ username }}</span>
        <button class="btn-logout" id="logoutBtn" @click="handleLogout">退出</button>
      </div>
    </header>

    <main class="admin-container">
      <!-- 登录面板 -->
      <section class="auth-panel" id="authPanel" v-show="activePanel === 'authPanel'">
        <h2 class="auth-title">管理员登录</h2>
        <form class="auth-form" id="loginForm" @submit.prevent="handleLogin">
          <div class="form-group">
            <label for="username">用户名</label>
            <input
              type="text"
              id="username"
              name="username"
              maxlength="32"
              autocomplete="username"
              required
              v-model="loginUsername"
            />
          </div>
          <div class="form-group">
            <label for="password">密码</label>
            <input
              type="password"
              id="password"
              name="password"
              autocomplete="current-password"
              required
              v-model="loginPassword"
            />
          </div>
          <button type="submit" class="btn btn-primary" :disabled="loginPending">登录</button>
        </form>
      </section>

      <!-- 频道列表面板 -->
      <section id="channelPanel" v-show="activePanel === 'channelPanel'">
        <div class="panel-toolbar">
          <h2>频道列表</h2>
          <div class="toolbar-actions">
            <button class="btn btn-secondary" id="refreshChannelsBtn" @click="loadChannels">刷新</button>
          </div>
        </div>

        <!-- 来源切换 -->
        <div class="source-bar">
          <span class="source-label">数据来源:</span>
          <div class="source-tabs">
            <button
              class="source-tab"
              :class="{ active: sourceType === 'config' }"
              data-source="config"
              @click="setSourceType('config')"
            >服务端指定</button>
            <button
              class="source-tab"
              :class="{ active: sourceType === 'local' }"
              data-source="local"
              @click="setSourceType('local')"
            >同源数据库</button>
          </div>
          <span class="source-status" id="sourceStatus">{{ sourceStatusText }}</span>
        </div>

        <div class="channel-list" id="channelList">
          <p v-if="channelLoading" class="connect-status">加载中...</p>
          <p v-else-if="channelError !== ''" class="connect-status" style="color:var(--color-danger);">{{ channelError }}</p>
          <p v-else-if="channels.length === 0" class="connect-status">未发现频道或数据库</p>
          <template v-else>
            <div
              v-for="channel in channels"
              :key="channel.source + ':' + channel.dbName"
              class="channel-card"
              @click="openChannel(channel)"
            >
              <div>
                <div class="channel-card-name">{{ channel.name }}</div>
                <div class="channel-card-meta">
                  <template v-if="channel.source === 'config'">
                    <span class="channel-card-badge">{{ channel.mediaType || '?' }}</span>
                    <span>{{ channel.dbName }}</span>
                    <span v-if="channel.mediaIdMax > 0">ID: {{ channel.mediaIdMin }}-{{ channel.mediaIdMax }}</span>
                  </template>
                  <template v-else>
                    <span>{{ channel.dbName }}</span>
                    <span>{{ formatSize(channel.size || 0) }}</span>
                    <span>{{ formatDateTime(channel.mtime || '') }}</span>
                  </template>
                </div>
              </div>
              <div style="color:var(--color-text-light);font-size:0.85rem;">进入 &rarr;</div>
            </div>
          </template>
        </div>
      </section>

      <!-- 频道详情面板 -->
      <section id="channelDetailPanel" v-show="activePanel === 'channelDetailPanel'">
        <div class="panel-toolbar">
          <div class="toolbar-left">
            <button class="btn btn-cancel" id="backToChannelsBtn" @click="backToChannels">返回</button>
            <h2 id="detailChannelName">{{ currentChannel ? currentChannel.name : '' }}</h2>
          </div>
          <div class="toolbar-right">
            <span style="font-size:0.85rem;color:var(--color-text-light);">ID范围:</span>
            <input type="number" id="rangeMin" min="1" class="range-input" v-model.number="rangeMinInput" />
            <span style="color:var(--color-text-light);">-</span>
            <input type="number" id="rangeMax" min="1" class="range-input" v-model.number="rangeMaxInput" />
            <button class="btn btn-secondary" id="loadRangeBtn" @click="loadRange">加载</button>
            <button
              class="btn btn-secondary"
              :class="{ 'confirm-state': fixConfirm }"
              id="fixDbBtn"
              :disabled="!canUpdate || fixPending"
              :title="canUpdate ? '检查并修复三个表行数对齐' : '当前账号缺少更新权限(U)'"
              @click="handleFixDatabase"
            >{{ fixButtonText }}</button>
          </div>
        </div>

        <!-- Tab 切换 -->
        <div class="detail-tabs">
          <button
            class="detail-tab"
            :class="{ active: activeTab === 'stats' }"
            data-tab="stats"
            @click="switchTab('stats')"
          >数据统计</button>
          <button
            class="detail-tab"
            :class="{ active: activeTab === 'labels' }"
            data-tab="labels"
            @click="switchTab('labels')"
          >标签管理</button>
        </div>

        <!-- 数据统计 -->
        <div id="statsContent" class="tab-content" v-show="activeTab === 'stats'">
          <div class="stats-table-container">
            <div class="stats-table-wrap">
              <table class="stats-table" id="statsTable" ref="statsTableRef">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>浏览</th>
                    <th>点赞</th>
                    <th>收藏</th>
                    <th>下载</th>
                    <th>分享</th>
                    <th>屏蔽</th>
                  </tr>
                </thead>
                <tbody id="statsTableBody">
                  <tr v-for="row in statsRows" :key="row.id">
                    <td>{{ row.id }}</td>
                    <td class="num">{{ formatNum(row.views) }}</td>
                    <td class="num">{{ formatNum(row.likes) }}</td>
                    <td class="num">{{ formatNum(row.favorites) }}</td>
                    <td class="num">{{ formatNum(extraValue(row.id, 'downloads')) }}</td>
                    <td class="num">{{ formatNum(extraValue(row.id, 'shares')) }}</td>
                    <td class="num">{{ formatNum(extraValue(row.id, 'blocks')) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="empty-tip" id="statsEmptyTip" v-show="dataLoaded && statsRows.length === 0">暂无数据，请先调整ID范围加载</p>
          </div>
        </div>

        <!-- 标签管理 -->
        <div id="labelsContent" class="tab-content" v-show="activeTab === 'labels'">
          <div class="label-table-container">
            <div class="label-table-wrap">
              <table class="label-table" id="labelTable">
                <thead>
                  <tr>
                    <th class="col-id">ID</th>
                    <th class="col-labels">标签</th>
                    <th class="col-actions">操作</th>
                  </tr>
                </thead>
                <tbody id="labelTableBody">
                  <tr v-for="row in labelRows" :key="row.id" :data-id="row.id">
                    <td>{{ row.id }}</td>
                    <td>
                      <div class="labels-edit" @click="focusLabelInput">
                        <span v-for="(label, index) in row.labels" :key="label + '-' + index" class="label-chip">
                          <span>{{ label }}</span>
                          <span class="remove-label" title="移除" @click.stop="removeLabel(row, index)">&times;</span>
                        </span>
                        <input
                          type="text"
                          class="add-label-input"
                          :placeholder="row.labels.length + '/' + LABEL_MAX_COUNT + '，回车添加'"
                          :maxlength="LABEL_MAX_LENGTH"
                          :value="labelInputs[row.id] || ''"
                          :disabled="!canUpdate"
                          @input="onLabelInput(row, $event)"
                          @keydown="onLabelKeydown(row, $event)"
                          @keypress="onLabelKeypress($event)"
                        />
                      </div>
                    </td>
                    <td>
                      <button
                        class="btn btn-sm label-action-clear"
                        :class="{ 'confirm-state': clearConfirmId === row.id }"
                        :disabled="!canUpdate"
                        @click="handleClearLabels(row)"
                      >{{ clearConfirmId === row.id ? '确认' : '清空' }}</button>
                      <button class="btn btn-primary btn-sm" :disabled="!canUpdate" @click="saveLabels(row)">保存</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="empty-tip" id="labelEmptyTip" v-show="dataLoaded && labelRows.length === 0">暂无数据</p>
          </div>
        </div>
      </section>
    </main>

    <!-- 回到顶部按钮 -->
    <button
      id="backToTop"
      class="back-to-top"
      :class="{ visible: backToTopVisible }"
      title="回到顶部"
      @click="backToTop"
    >&#9650;</button>

    <!-- 浮动表头 -->
    <div
      id="floatingHeader"
      class="floating-header"
      :class="{ visible: floatingVisible }"
      :style="floatingHeaderStyle"
    >
      <table class="floating-table" id="floatingTable" :style="{ width: floatingTableWidth + 'px' }">
        <thead>
          <tr id="floatingRow">
            <th v-for="(column, index) in floatingColumns" :key="index" :style="{ width: column.width + 'px' }">{{ column.text }}</th>
          </tr>
        </thead>
      </table>
    </div>

    <footer class="admin-footer">
      <p>
        &copy; 2026
        <a :href="AUTHOR_INFO.url" target="_blank" rel="noopener noreferrer">{{ AUTHOR_INFO.name }}</a>.
        <a :href="AUTHOR_INFO.projectUrl" target="_blank" rel="noopener noreferrer">{{ AUTHOR_INFO.project }}</a>
        v{{ PROJECT_VERSION }}
      </p>
    </footer>

    <!-- 调试面板 -->
    <div id="debugPanel" class="debug-panel" :class="{ visible: debugVisible }" ref="debugPanelRef">
      <div
        v-for="(line, index) in debugLines"
        :key="index"
        class="debug-line"
        :class="{ 'dbg-warn': line.level === 'warn', 'dbg-error': line.level === 'error' }"
      ><span class="dbg-time">{{ line.time }}</span><span class="dbg-tag">[{{ line.category }}]</span> {{ line.text }}<template v-if="line.detail !== ''"> {{ line.detail }}</template></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AUTHOR_INFO, DEBUG, PROJECT_VERSION } from '~~/shared/constants/site'
import type { ExtraRecord, LabelRecord, StatsRecord } from '~~/shared/types/channel'
import {
  MGR_SOURCE_KEY,
  MGR_WORKSPACE_KEY,
  clearMgrSession,
  readMgrToken,
  saveMgrSession,
  useMgrApi
} from '~/composables/useMgrApi'
import type { MgrChannel } from '~/composables/useMgrApi'
import { useStorage } from '~/composables/useStorage'
import { useToast } from '~/composables/useToast'

/* ============================================================
   常量
   ============================================================ */

/* 调试日志开关, 沿用站点统一常量 */
const MGR_DEBUG: boolean = DEBUG

/* 标签约束, 需与服务端 MAX_LABELS / MAX_LABEL_LENGTH 保持一致 */
const LABEL_MAX_COUNT = 10
const LABEL_MAX_LENGTH = 20

/* 调试面板最多保留的行数 */
const DEBUG_LINE_LIMIT = 300

/* 二次确认按钮的回退时间 */
const CONFIRM_TIMEOUT = 3000

/* 退格删除标签后的同步延迟 */
const LABEL_SYNC_DELAY = 600

/* 资源体积换算基数 */
const SIZE_UNIT = 1024

/* 回到顶部按钮的出现阈值 */
const BACK_TO_TOP_OFFSET = 300

/* 权限位顺序 */
const PERM_ORDER = ['C', 'D', 'R', 'U'] as const

/* 调试分类配色 */
const DBG_STYLES: Record<string, string> = {
  '系统初化': 'color:#60A5FA;font-weight:bold',
  '认证': 'color:#A78BFA;font-weight:bold',
  '频道': 'color:#34D399;font-weight:bold',
  '数据': 'color:#FBBF24;font-weight:bold',
  '标签': 'color:#F472B6;font-weight:bold',
  '用户操作': 'color:#60A5FA;font-weight:bold',
  'API': 'color:#818CF8;font-weight:bold',
  '工作区': 'color:#22D3EE;font-weight:bold',
  'Toast': 'color:#888',
  'warn': 'color:#F59E0B;font-weight:bold',
  'error': 'color:#EF4444;font-weight:bold;font-style:italic'
}

/* ============================================================
   类型
   ============================================================ */

type PanelKey = 'authPanel' | 'channelPanel' | 'channelDetailPanel'
type SourceType = 'config' | 'local'
type TabName = 'stats' | 'labels'
type ToastType = 'info' | 'success' | 'error'
type DebugLevel = 'log' | 'warn' | 'error'
type PermFlag = 'C' | 'D' | 'R' | 'U'

/* 频道条目: 服务端配置与同源数据库共用 */
interface ChannelView extends MgrChannel {
  source: SourceType
  fullQuery: boolean
  size?: number
  mtime?: string
}

/* 工作区快照 */
interface WorkspaceState {
  sourceType: SourceType
  dbName: string
  dbPath: string
  channelName: string
  mediaIdMin: number
  mediaIdMax: number
  mediaType: string
  activeTab: TabName
  rangeMin: number
  rangeMax: number
}

/* 调试行 */
interface DebugLine {
  time: string
  category: string
  text: string
  detail: string
  level: DebugLevel
}

/* 浮动表头列 */
interface FloatingColumn {
  text: string
  width: number
}

/* ============================================================
   实例
   ============================================================ */

const api = useMgrApi()
const storage = useStorage()
const { toastMessage, toastVisible, showToast } = useToast()

useHead({ title: '频道管理端' })

/* ============================================================
   状态
   ============================================================ */

const activePanel = ref<PanelKey>('authPanel')
const sourceType = ref<SourceType>(readSourceType())
const channels = ref<ChannelView[]>([])
const channelLoading = ref(false)
const channelError = ref('')
const currentChannel = ref<ChannelView | null>(null)

const username = ref('')
const permission = ref<string | null>(null)
const loginUsername = ref('')
const loginPassword = ref('')
const loginPending = ref(false)

const rangeMinInput = ref(1)
const rangeMaxInput = ref(100)
const rangeMin = ref(1)
const rangeMax = ref(100)

const statsRows = ref<StatsRecord[]>([])
const extraRows = ref<ExtraRecord[]>([])
const labelRows = ref<LabelRecord[]>([])
const labelInputs = reactive<Record<string, string>>({})
const dataLoaded = ref(false)
const activeTab = ref<TabName>('stats')

const fixConfirm = ref(false)
const fixPending = ref(false)
const clearConfirmId = ref<number | null>(null)

const backToTopVisible = ref(false)
const toastType = ref<ToastType>('info')
const debugVisible = ref(false)
const debugLines = ref<DebugLine[]>([])
const debugPanelRef = ref<HTMLElement | null>(null)

const statsTableRef = ref<HTMLTableElement | null>(null)
const floatingColumns = ref<FloatingColumn[]>([])
const floatingTableWidth = ref(0)
const floatingVisible = ref(false)
const floatingLeft = ref(0)
const floatingWidth = ref(0)

let fixConfirmTimer: ReturnType<typeof setTimeout> | null = null
let clearConfirmTimer: ReturnType<typeof setTimeout> | null = null
const labelSaveTimers = new Map<number, ReturnType<typeof setTimeout>>()

/* ============================================================
   派生状态
   ============================================================ */

const isLoggedIn = computed(() => username.value !== '')
const canUpdate = computed(() => hasPermission('U'))
const sourceStatusText = computed(() =>
  sourceType.value === 'config' ? '从服务端指定的频道配置读取' : '扫描数据库目录'
)
const fixButtonText = computed(() => {
  if (fixPending.value) return '修复中...'
  return fixConfirm.value ? '确认修复' : '修复数据库'
})
const floatingHeaderStyle = computed(() => ({
  left: floatingLeft.value + 'px',
  width: floatingWidth.value + 'px'
}))
const extraMap = computed<Map<number, ExtraRecord>>(() => {
  const map = new Map<number, ExtraRecord>()
  for (const record of extraRows.value) map.set(Number(record.id), record)
  return map
})

/* ============================================================
   格式化
   ============================================================ */

function pad2(value: number): string {
  return value < 10 ? '0' + value : String(value)
}

function formatNum(value: unknown): string {
  const num = Number(value)
  return Number.isFinite(num) ? String(num) : '0'
}

function formatSize(bytes: number): string {
  const value = Number(bytes) || 0
  if (value < SIZE_UNIT) return value + ' B'
  if (value < SIZE_UNIT * SIZE_UNIT) return (value / SIZE_UNIT).toFixed(1) + ' KB'
  return (value / (SIZE_UNIT * SIZE_UNIT)).toFixed(1) + ' MB'
}

/* 统一展示为 yyyy-MM-dd HH:mm:ss+HH:mm */
function formatDateTime(value: string): string {
  if (!value) return ''
  const date = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return value
  const offset = -date.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const absolute = Math.abs(offset)
  const clock = formatClock(date)
  return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate()) + ' ' +
    clock + sign + pad2(Math.floor(absolute / 60)) + ':' + pad2(absolute % 60)
}

function formatClock(date: Date): string {
  return pad2(date.getHours()) + ':' + pad2(date.getMinutes()) + ':' + pad2(date.getSeconds())
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message
  return typeof error === 'string' ? error : ''
}

function extraValue(id: number, field: 'downloads' | 'shares' | 'blocks'): number {
  const record = extraMap.value.get(Number(id))
  return record ? Number(record[field] || 0) : 0
}

/* ============================================================
   提示
   ============================================================ */

function notify(message: string, type: ToastType = 'info', duration = 3000): void {
  toastType.value = type
  showToast(message, duration)
  dbg('Toast', type + ': ' + message)
}

/* ============================================================
   调试日志
   ============================================================ */

function pushDebugLine(level: DebugLevel, category: string, text: string, data?: unknown): void {
  let detail = ''
  if (data !== undefined) {
    try {
      detail = JSON.stringify(data) ?? String(data)
    } catch {
      detail = String(data)
    }
  }
  debugLines.value.push({ time: formatClock(new Date()), category, text, detail, level })
  if (debugLines.value.length > DEBUG_LINE_LIMIT) {
    debugLines.value.splice(0, debugLines.value.length - DEBUG_LINE_LIMIT)
  }
}

/* 面板始终记录, 控制台输出受 MGR_DEBUG 控制 */
function dbg(category: string, text: string, data?: unknown): void {
  if (MGR_DEBUG) {
    const style = DBG_STYLES[category] || 'color:#888'
    if (data !== undefined) console.log('%c[' + category + ']%c ' + text, style, 'color:inherit', data)
    else console.log('%c[' + category + ']%c ' + text, style, 'color:inherit')
  }
  pushDebugLine('log', category, text, data)
}

function dbgWarn(category: string, text: string, data?: unknown): void {
  if (MGR_DEBUG) {
    if (data !== undefined) console.warn('%c[' + category + ']%c ' + text, DBG_STYLES.warn, 'color:inherit', data)
    else console.warn('%c[' + category + ']%c ' + text, DBG_STYLES.warn, 'color:inherit')
  }
  pushDebugLine('warn', category, text, data)
}

function dbgError(category: string, text: string, data?: unknown): void {
  if (MGR_DEBUG) {
    if (data !== undefined) console.error('%c[' + category + ']%c ' + text, DBG_STYLES.error, 'color:inherit', data)
    else console.error('%c[' + category + ']%c ' + text, DBG_STYLES.error, 'color:inherit')
  }
  pushDebugLine('error', category, text, data)
}

function toggleDebugPanel(): void {
  debugVisible.value = !debugVisible.value
}

/* ============================================================
   权限
   ============================================================ */

function hasPermission(flag: PermFlag): boolean {
  const value = permission.value || ''
  if (value.length < PERM_ORDER.length) return false
  return value[PERM_ORDER.indexOf(flag)] === '1'
}

function ensureCanUpdate(): boolean {
  if (canUpdate.value) return true
  notify('当前账号缺少更新权限(U), 操作已拦截', 'error')
  pushDebugLine('warn', '认证', '缺少更新权限', { permission: permission.value })
  return false
}

/* 权限位缺失或不足时给出明确提示 */
function checkPermissionHint(): void {
  const value = permission.value || ''
  if (value.length < PERM_ORDER.length) {
    notify('未获取到完整权限位, 写操作已禁用', 'error')
    return
  }
  if (!hasPermission('U')) notify('当前账号缺少更新权限(U), 修复与标签保存已禁用', 'error')
}

/* ============================================================
   本地存储
   ============================================================ */

function readSourceType(): SourceType {
  try {
    return localStorage.getItem(MGR_SOURCE_KEY) === 'local' ? 'local' : 'config'
  } catch {
    return 'config'
  }
}

function writeSourceType(value: SourceType): void {
  try {
    localStorage.setItem(MGR_SOURCE_KEY, value)
  } catch {
    /* 配额或权限异常时静默降级 */
  }
}

function saveWorkspace(): void {
  const channel = currentChannel.value
  if (!channel) return
  const state: WorkspaceState = {
    sourceType: sourceType.value,
    dbName: channel.dbName || '',
    dbPath: channel.dbPath || '',
    channelName: channel.name || '',
    mediaIdMin: channel.mediaIdMin || 0,
    mediaIdMax: channel.mediaIdMax || 0,
    mediaType: channel.mediaType || '',
    activeTab: activeTab.value,
    rangeMin: rangeMin.value,
    rangeMax: rangeMax.value
  }
  storage.write(MGR_WORKSPACE_KEY, state)
  dbg('工作区', '保存状态', state)
}

function clearWorkspace(): void {
  storage.remove(MGR_WORKSPACE_KEY)
  try {
    localStorage.removeItem(MGR_SOURCE_KEY)
  } catch {
    /* 忽略移除异常 */
  }
  dbg('工作区', '清空状态')
}

function restoreWorkspace(): boolean {
  const state = storage.read<WorkspaceState | null>(MGR_WORKSPACE_KEY, null)
  if (!state || !state.dbName) {
    dbg('工作区', '无保存的状态')
    return false
  }
  sourceType.value = state.sourceType === 'local' ? 'local' : 'config'
  currentChannel.value = {
    id: String(state.dbName).replace(/\.db$/, ''),
    name: state.channelName || state.dbName,
    dbPath: state.dbPath || '',
    dbName: state.dbName,
    mediaType: state.mediaType || '',
    mediaPrefix: '',
    mediaExt: '',
    mediaIdMin: state.mediaIdMin || 0,
    mediaIdMax: state.mediaIdMax || 0,
    mediaIdLength: 0,
    source: sourceType.value,
    fullQuery: false
  }
  rangeMin.value = state.rangeMin || 1
  rangeMax.value = state.rangeMax || 100
  rangeMinInput.value = rangeMin.value
  rangeMaxInput.value = rangeMax.value
  activeTab.value = state.activeTab === 'labels' ? 'labels' : 'stats'
  dbg('工作区', '恢复状态', state)
  return true
}

/* ============================================================
   认证
   ============================================================ */

async function loadUserInfo(): Promise<boolean> {
  dbg('认证', '验证Token...')
  try {
    const info = await api.fetchInfo()
    username.value = info.username
    permission.value = info.permission || null
    dbg('认证', '已认证', { username: info.username, permission: info.permission })
    checkPermissionHint()
    return true
  } catch (error) {
    dbgWarn('认证', 'Token无效或已过期', { error: errorText(error) })
    clearMgrSession()
    username.value = ''
    permission.value = null
    activePanel.value = 'authPanel'
    return false
  }
}

async function handleLogin(): Promise<void> {
  const name = loginUsername.value.trim()
  const password = loginPassword.value.trim()
  if (!name || !password) {
    notify('请输入用户名和密码', 'error')
    return
  }
  loginPending.value = true
  dbg('认证', '尝试登录', { username: name })
  try {
    const data = await api.login(name, password)
    saveMgrSession(data.token, data.username)
    username.value = data.username
    loginPassword.value = ''
    notify('登录成功', 'success')
    dbg('认证', '登录成功', { username: data.username })
    const valid = await loadUserInfo()
    if (valid) await restoreOrShowChannelPanel()
  } catch (error) {
    dbgError('认证', '登录失败: ' + errorText(error))
    notify(errorText(error) || '登录失败', 'error')
  } finally {
    loginPending.value = false
  }
}

async function handleLogout(): Promise<void> {
  dbg('认证', '登出')
  try {
    await api.logout()
  } catch {
    /* 令牌失效时忽略登出异常 */
  }
  clearMgrSession()
  clearWorkspace()
  currentChannel.value = null
  channels.value = []
  username.value = ''
  permission.value = null
  statsRows.value = []
  extraRows.value = []
  labelRows.value = []
  dataLoaded.value = false
  disconnectFloatingHeader()
  activePanel.value = 'authPanel'
  notify('已登出', 'info')
}

/* ============================================================
   面板与工作区
   ============================================================ */

async function restoreOrShowChannelPanel(): Promise<void> {
  if (!restoreWorkspace()) {
    await showChannelPanel()
    return
  }
  const channel = currentChannel.value
  if (!channel) {
    await showChannelPanel()
    return
  }
  dbg('工作区', '尝试恢复上次工作区', { dbName: channel.dbName })
  try {
    const payload = await api.fetchStats({
      dbPath: channel.dbPath,
      dbName: channel.dbName,
      min: rangeMin.value,
      max: rangeMax.value
    })
    applyStatsPayload(payload)
    activePanel.value = 'channelDetailPanel'
    await applyTabLayout()
    dbg('工作区', '恢复成功', { dbName: channel.dbName })
  } catch (error) {
    dbgWarn('工作区', '恢复失败，返回首页', { error: errorText(error) })
    clearWorkspace()
    currentChannel.value = null
    await showChannelPanel()
  }
}

async function showChannelPanel(): Promise<void> {
  activePanel.value = 'channelPanel'
  dbg('频道', '显示频道列表', { sourceType: sourceType.value })
  await loadChannels()
}

/* ============================================================
   频道列表
   ============================================================ */

function setSourceType(next: SourceType): void {
  if (sourceType.value === next) return
  sourceType.value = next
  writeSourceType(next)
  dbg('频道', '数据来源切换: ' + next)
  void loadChannels()
}

async function loadChannels(): Promise<void> {
  channelLoading.value = true
  channelError.value = ''
  channels.value = []
  try {
    if (sourceType.value === 'config') {
      dbg('频道', '加载频道配置(服务端指定)...')
      const data = await api.fetchChannels()
      channels.value = (data.channels || []).map(item => ({
        id: item.id,
        name: item.name,
        dbPath: item.dbPath,
        dbName: item.dbName,
        mediaType: item.mediaType,
        mediaPrefix: item.mediaPrefix,
        mediaExt: item.mediaExt,
        mediaIdMin: item.mediaIdMin,
        mediaIdMax: item.mediaIdMax,
        mediaIdLength: item.mediaIdLength,
        source: 'config' as SourceType,
        fullQuery: false
      }))
    } else {
      dbg('频道', '扫描同源数据库...')
      const data = await api.listDbs()
      channels.value = (data.files || []).map(item => ({
        id: item.name.replace(/\.db$/, ''),
        name: item.name,
        dbPath: '',
        dbName: item.path,
        mediaType: '',
        mediaPrefix: '',
        mediaExt: '',
        mediaIdMin: 0,
        mediaIdMax: 0,
        mediaIdLength: 0,
        source: 'local' as SourceType,
        fullQuery: false,
        size: item.size,
        mtime: item.mtime
      }))
    }
    dbg('频道', '加载完成', { count: channels.value.length })
  } catch (error) {
    channelError.value = errorText(error) || '加载失败'
    dbgError('频道', '加载失败: ' + channelError.value)
  } finally {
    channelLoading.value = false
  }
}

/* ============================================================
   频道详情
   ============================================================ */

async function openChannel(channel: ChannelView): Promise<void> {
  dbg('频道', '打开频道', { name: channel.name, dbName: channel.dbName, source: channel.source })
  currentChannel.value = channel
  if (channel.source === 'config' && channel.mediaIdMax > 0) {
    rangeMin.value = channel.mediaIdMin
    rangeMax.value = channel.mediaIdMax
    channel.fullQuery = false
  } else {
    rangeMin.value = 1
    rangeMax.value = 100
    channel.fullQuery = true
  }
  rangeMinInput.value = rangeMin.value
  rangeMaxInput.value = rangeMax.value
  activeTab.value = 'stats'
  activePanel.value = 'channelDetailPanel'
  await loadChannelData()
  saveWorkspace()
}

function applyStatsPayload(payload: {
  stats?: StatsRecord[]
  extra?: ExtraRecord[]
  labels?: LabelRecord[]
}): void {
  statsRows.value = (payload.stats || []).map(item => ({
    id: Number(item.id),
    views: Number(item.views),
    likes: Number(item.likes),
    favorites: Number(item.favorites)
  }))
  extraRows.value = (payload.extra || []).map(item => ({
    id: Number(item.id),
    downloads: Number(item.downloads),
    shares: Number(item.shares),
    blocks: Number(item.blocks)
  }))
  labelRows.value = (payload.labels || []).map(item => ({
    id: Number(item.id),
    labels: [...(item.labels || [])]
  }))
  for (const row of labelRows.value) labelInputs[row.id] = ''
  dataLoaded.value = true
}

async function loadChannelData(): Promise<void> {
  const channel = currentChannel.value
  if (!channel) return
  const fullQuery = channel.fullQuery
  dbg('数据', '加载频道数据', {
    dbPath: channel.dbPath,
    dbName: channel.dbName,
    fullQuery,
    range: rangeMin.value + '-' + rangeMax.value
  })
  try {
    const payload = await api.fetchStats({
      dbPath: channel.dbPath,
      dbName: channel.dbName,
      min: rangeMin.value,
      max: rangeMax.value,
      fullQuery
    })
    applyStatsPayload(payload)
    if (fullQuery && statsRows.value.length > 0) {
      const ids = statsRows.value.map(item => Number(item.id))
      rangeMin.value = Math.min(...ids)
      rangeMax.value = Math.max(...ids)
      rangeMinInput.value = rangeMin.value
      rangeMaxInput.value = rangeMax.value
      channel.mediaIdMin = rangeMin.value
      channel.mediaIdMax = rangeMax.value
      channel.fullQuery = false
      dbg('数据', '全量查询后更新ID范围', { min: rangeMin.value, max: rangeMax.value })
    }
    await applyTabLayout()
    saveWorkspace()
    notify('已加载 ' + statsRows.value.length + ' 条数据', 'success')
  } catch (error) {
    dbgError('数据', '频道数据加载失败: ' + errorText(error))
    notify(errorText(error) || '加载失败', 'error')
  }
}

async function loadRange(): Promise<void> {
  let min = Math.floor(Number(rangeMinInput.value) || 1)
  let max = Math.floor(Number(rangeMaxInput.value) || 100)
  if (min < 1) min = 1
  if (max < min) max = min
  rangeMin.value = min
  rangeMax.value = max
  rangeMinInput.value = min
  rangeMaxInput.value = max
  dbg('数据', '加载ID范围: ' + min + '-' + max)
  await loadChannelData()
}

function switchTab(tab: TabName): void {
  activeTab.value = tab
  dbg('数据', '切换Tab: ' + tab)
  void applyTabLayout()
  saveWorkspace()
}

async function applyTabLayout(): Promise<void> {
  await nextTick()
  if (activeTab.value === 'stats') buildFloatingHeader()
  else disconnectFloatingHeader()
}

async function backToChannels(): Promise<void> {
  dbg('频道', '返回频道列表')
  clearWorkspace()
  currentChannel.value = null
  disconnectFloatingHeader()
  await showChannelPanel()
}

/* ============================================================
   标签管理
   ============================================================ */

function focusLabelInput(event: MouseEvent): void {
  const container = event.currentTarget as HTMLElement | null
  container?.querySelector<HTMLInputElement>('.add-label-input')?.focus()
}

function onLabelKeypress(event: KeyboardEvent): void {
  if (event.key === 'Enter') event.preventDefault()
}

function onLabelKeydown(row: LabelRecord, event: KeyboardEvent): void {
  const input = event.target as HTMLInputElement
  if (event.key === 'Enter' || event.key === ',' || event.key === '，') {
    event.preventDefault()
    addLabel(row, input)
    return
  }
  if (event.key === 'Backspace' && input.value === '' && row.labels.length > 0) {
    event.preventDefault()
    if (!ensureCanUpdate()) return
    row.labels.pop()
    scheduleLabelSave(row)
    return
  }
  if (event.key === ' ') event.preventDefault()
}

function onLabelInput(row: LabelRecord, event: Event): void {
  const input = event.target as HTMLInputElement
  if (input.value.includes(',') || input.value.includes('，')) {
    addLabel(row, input)
    return
  }
  labelInputs[row.id] = input.value
}

function addLabel(row: LabelRecord, input: HTMLInputElement): void {
  const value = input.value.replace(/[,，\s]/g, '').trim()
  input.value = ''
  labelInputs[row.id] = ''
  if (!value || row.labels.includes(value)) return
  if (!ensureCanUpdate()) return
  if (value.length > LABEL_MAX_LENGTH) {
    dbgWarn('标签', '标签添加失败: 长度超限', { length: value.length })
    notify('标签长度不能超过' + LABEL_MAX_LENGTH + '个字符', 'error')
    return
  }
  if (row.labels.length >= LABEL_MAX_COUNT) {
    dbgWarn('标签', '标签添加失败: 数量达上限', { count: row.labels.length })
    notify('标签数量已达上限(' + LABEL_MAX_COUNT + '个)', 'error')
    return
  }
  dbg('标签', '添加标签', { id: row.id, label: value })
  row.labels.push(value)
  void submitLabels(row.id, row.labels.slice())
}

function removeLabel(row: LabelRecord, index: number): void {
  if (!ensureCanUpdate()) return
  dbg('标签', '移除标签', { id: row.id, label: row.labels[index] })
  row.labels.splice(index, 1)
  void submitLabels(row.id, row.labels.slice())
}

function scheduleLabelSave(row: LabelRecord): void {
  const previous = labelSaveTimers.get(row.id)
  if (previous) clearTimeout(previous)
  const channel = currentChannel.value
  labelSaveTimers.set(row.id, setTimeout(() => {
    labelSaveTimers.delete(row.id)
    /* 期间切换了频道则放弃本次延迟同步, 避免写错数据库 */
    if (currentChannel.value !== channel) return
    void submitLabels(row.id, row.labels.slice(), true)
  }, LABEL_SYNC_DELAY))
}

function saveLabels(row: LabelRecord): void {
  if (!ensureCanUpdate()) return
  void submitLabels(row.id, row.labels.slice())
}

function resetClearConfirm(): void {
  if (clearConfirmTimer) {
    clearTimeout(clearConfirmTimer)
    clearConfirmTimer = null
  }
  clearConfirmId.value = null
}

function handleClearLabels(row: LabelRecord): void {
  if (row.labels.length === 0) return
  if (!ensureCanUpdate()) return
  if (clearConfirmId.value === row.id) {
    resetClearConfirm()
    dbg('标签', '清空标签', { id: row.id })
    row.labels.splice(0, row.labels.length)
    void submitLabels(row.id, [])
    return
  }
  clearConfirmId.value = row.id
  if (clearConfirmTimer) clearTimeout(clearConfirmTimer)
  clearConfirmTimer = setTimeout(() => {
    clearConfirmId.value = null
    clearConfirmTimer = null
  }, CONFIRM_TIMEOUT)
}

async function submitLabels(mediaId: number, labels: string[], quiet = false): Promise<void> {
  const channel = currentChannel.value
  if (!channel) return
  dbg('用户操作', '更新标签', {
    id: mediaId,
    labels,
    dbPath: channel.dbPath,
    dbName: channel.dbName,
    quiet
  })
  try {
    const data = await api.updateLabels({
      dbPath: channel.dbPath,
      dbName: channel.dbName,
      id: mediaId,
      labels
    })
    if (!quiet) notify('ID ' + mediaId + ' 标签已更新', 'success')
    const row = labelRows.value.find(item => item.id === mediaId)
    if (row) row.labels = [...(data.labels || [])]
  } catch (error) {
    dbgError('标签', '标签更新失败: ' + errorText(error))
    notify(errorText(error) || '更新失败', 'error')
  }
}

/* ============================================================
   修复数据库
   ============================================================ */

function resetFixConfirm(): void {
  if (fixConfirmTimer) {
    clearTimeout(fixConfirmTimer)
    fixConfirmTimer = null
  }
  fixConfirm.value = false
}

async function handleFixDatabase(): Promise<void> {
  const channel = currentChannel.value
  if (!channel) return
  if (!fixConfirm.value) {
    fixConfirm.value = true
    if (fixConfirmTimer) clearTimeout(fixConfirmTimer)
    fixConfirmTimer = setTimeout(() => {
      fixConfirm.value = false
      fixConfirmTimer = null
    }, CONFIRM_TIMEOUT)
    return
  }
  resetFixConfirm()
  fixPending.value = true
  dbg('用户操作', '修复数据库', { dbPath: channel.dbPath, dbName: channel.dbName })
  try {
    const result = await api.fixDb(channel.dbPath, channel.dbName)
    const filled = result.filled
    const total = filled.stats + filled.extra + filled.labels
    dbg('用户操作', '修复完成', result)
    if (total > 0) {
      notify(
        '修复完成：stats +' + filled.stats + '，extra +' + filled.extra + '，labels +' + filled.labels,
        'success'
      )
    } else {
      notify('数据库无需修复，三个表已对齐', 'info')
    }
    await loadChannelData()
  } catch (error) {
    dbgError('用户操作', '修复失败: ' + errorText(error))
    notify(errorText(error) || '修复失败', 'error')
  } finally {
    fixPending.value = false
  }
}

/* ============================================================
   浮动表头
   ============================================================ */

function measureFloatingColumns(table: HTMLTableElement): void {
  const headers = Array.from(table.querySelectorAll<HTMLTableCellElement>('thead th'))
  floatingColumns.value = headers.map(header => ({
    text: (header.textContent || '').trim(),
    width: header.offsetWidth
  }))
  floatingTableWidth.value = table.offsetWidth
}

function alignFloatingHeader(): void {
  const table = statsTableRef.value
  if (!table) return
  const rect = table.getBoundingClientRect()
  floatingLeft.value = rect.left
  floatingWidth.value = rect.width
}

function handleFloatingScroll(): void {
  const table = statsTableRef.value
  if (!table) return
  const rect = table.getBoundingClientRect()
  if (rect.top <= 0 && !floatingVisible.value) {
    alignFloatingHeader()
    floatingVisible.value = true
  } else if (rect.top > 0 && floatingVisible.value) {
    floatingVisible.value = false
  }
  if (floatingVisible.value) alignFloatingHeader()
}

function handleFloatingResize(): void {
  const table = statsTableRef.value
  if (table) measureFloatingColumns(table)
  handleFloatingScroll()
}

function buildFloatingHeader(): void {
  disconnectFloatingHeader()
  const table = statsTableRef.value
  if (!table) return
  measureFloatingColumns(table)
  window.addEventListener('scroll', handleFloatingScroll, { passive: true })
  window.addEventListener('resize', handleFloatingResize, { passive: true })
  handleFloatingScroll()
}

function disconnectFloatingHeader(): void {
  window.removeEventListener('scroll', handleFloatingScroll)
  window.removeEventListener('resize', handleFloatingResize)
  floatingVisible.value = false
  floatingLeft.value = 0
  floatingWidth.value = 0
}

/* ============================================================
   回到顶部与全局事件
   ============================================================ */

function handleWindowScroll(): void {
  backToTopVisible.value = window.scrollY > BACK_TO_TOP_OFFSET
}

function backToTop(): void {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function handleGlobalKeydown(event: KeyboardEvent): void {
  if (event.ctrlKey && event.shiftKey && event.key === 'D') {
    event.preventDefault()
    toggleDebugPanel()
  }
}

/* 点击确认按钮之外的区域时立即回退所有确认态 */
function handleDocumentClick(event: MouseEvent): void {
  const target = event.target as HTMLElement | null
  if (!target?.closest('#fixDbBtn')) resetFixConfirm()
  if (!target?.closest('.label-action-clear')) resetClearConfirm()
}

/* ============================================================
   生命周期
   ============================================================ */

watch(() => debugLines.value.length, async () => {
  await nextTick()
  const panel = debugPanelRef.value
  if (panel) panel.scrollTop = panel.scrollHeight
})

onMounted(async () => {
  window.addEventListener('scroll', handleWindowScroll, { passive: true })
  window.addEventListener('keydown', handleGlobalKeydown)
  document.addEventListener('click', handleDocumentClick)
  dbg('系统初化', '管理端启动', { debug: MGR_DEBUG, source: sourceType.value })
  handleWindowScroll()

  if (!readMgrToken()) {
    dbg('认证', '无Token，显示登录面板')
    activePanel.value = 'authPanel'
    return
  }
  const valid = await loadUserInfo()
  if (valid) await restoreOrShowChannelPanel()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleWindowScroll)
  window.removeEventListener('keydown', handleGlobalKeydown)
  document.removeEventListener('click', handleDocumentClick)
  disconnectFloatingHeader()
  resetFixConfirm()
  resetClearConfirm()
  for (const timer of labelSaveTimers.values()) clearTimeout(timer)
  labelSaveTimers.clear()
})
</script>

<style src="~/assets/css/mgr.css"></style>

<style>
/* 原实现以 body 作为纵向弹性容器, 迁移后由页面外壳承担同一职责 */
.mgr-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
}
</style>
