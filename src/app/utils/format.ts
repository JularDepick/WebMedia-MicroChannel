/* ============================================================
   通用格式化工具
   纯函数,可从任意组合式函数或组件调用
   ============================================================ */

import type { ChannelConfig } from '~~/shared/types/channel'

/* 参与资源地址拼接的频道字段 */
export type MediaPathChannel = Pick<
  ChannelConfig,
  'resourceUrl' | 'mediaPrefix' | 'mediaIdLength' | 'mediaExt'
>

/* 数量格式化: 1.2kw / 1.2w / 1.2k / 原值 */
export function formatCount(value: number): string {
  if (!Number.isFinite(value)) return '0'
  if (value >= 10000000) return (value / 10000000).toFixed(1) + 'kw'
  if (value >= 10000) return (value / 10000).toFixed(1) + 'w'
  if (value >= 1000) return (value / 1000).toFixed(1) + 'k'
  return String(Math.round(value))
}

/* 编号补零,按频道 mediaIdLength 对齐 */
export function padId(value: number, length: number): string {
  return String(value).padStart(Math.max(1, length), '0')
}

/* 拼接资源地址: resourceUrl + mediaPrefix + 补零编号 + mediaExt */
export function mediaPath(channel: MediaPathChannel, id: number): string {
  const base = channel.resourceUrl || ''
  const prefix = channel.mediaPrefix || ''
  const ext = channel.mediaExt || ''
  return base + prefix + padId(id, channel.mediaIdLength) + ext
}

/* 资源文件名: mediaPrefix + 补零编号 + mediaExt */
export function mediaFileName(channel: MediaPathChannel, id: number): string {
  return (channel.mediaPrefix || '') + padId(id, channel.mediaIdLength) + (channel.mediaExt || '')
}

/* 日期格式化: yyyy-MM-dd HH:mm:ss+HH:mm */
export function formatDateTime(input: Date | number | string): string {
  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) return ''
  const two = (v: number) => String(v).padStart(2, '0')
  const offsetMinutes = -date.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMinutes)
  const ymd = date.getFullYear() + '-' + two(date.getMonth() + 1) + '-' + two(date.getDate())
  const hms = two(date.getHours()) + ':' + two(date.getMinutes()) + ':' + two(date.getSeconds())
  return ymd + ' ' + hms + sign + two(Math.floor(abs / 60)) + ':' + two(abs % 60)
}

/* 生成 8 位随机 hex 标识 */
export function genId(): string {
  const head = Math.random().toString(16).slice(2, 6)
  const tail = Date.now().toString(16).slice(-4)
  return (head + tail).slice(0, 8).padEnd(8, '0')
}
