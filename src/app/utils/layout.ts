/* ============================================================
   布局计算工具
   固定列数网格的列宽、视窗比例与卡片高度度量
   ============================================================ */

/* 视窗比例对应的 padding-bottom 百分比, original 不参与映射 */
export const RATIO_PADDING: Record<string, number> = {
  '2:1': 50,
  '3:2': 66.67,
  '4:3': 75,
  '5:4': 80,
  '16:9': 56.25,
  '1:1': 100,
  '1:2': 200,
  '2:3': 150,
  '3:4': 133.33,
  '4:5': 125,
  '9:16': 177.78
}

/* 单列时卡片最大宽度占容器宽度的比例 */
export const SINGLE_COLUMN_MAX_RATIO = 0.8

/* 列间距兜底值(px), 与 CSS --grid-gap 默认值一致 */
export const DEFAULT_GRID_GAP = 12

/*
  计算固定列数网格的每列宽度
  列数不自动减少, 列宽在 [minWidth, maxWidth] 内自适应
*/
export function computeFixedColumnWidth(
  containerWidth: number,
  columns: number,
  minWidth: number,
  maxWidth: number,
  gap: number,
  singleMaxRatio: number = SINGLE_COLUMN_MAX_RATIO
): number {
  const cols = Math.max(1, Math.floor(columns))
  const min = Math.max(0, minWidth)
  const max = Math.max(min, maxWidth)
  const g = Math.max(0, gap || 0)
  const width = Math.max(0, containerWidth)
  const ratio = singleMaxRatio !== undefined ? singleMaxRatio : SINGLE_COLUMN_MAX_RATIO

  const idealWidth = (width - (cols - 1) * g) / cols
  let colWidth = Math.min(max, Math.max(min, idealWidth))

  if (cols === 1) {
    const singleLimit = Math.min(max, width * ratio)
    colWidth = Math.min(singleLimit, colWidth)
    colWidth = Math.max(min, colWidth)
  }

  return colWidth
}

/* 视窗比例转 aspect-ratio 数值, original 返回 null */
export function ratioToAspect(ratio: string): string | null {
  if (!ratio || ratio === 'original') return null
  const padding = RATIO_PADDING[ratio]
  if (padding === undefined || padding <= 0) return null
  return (100 / padding).toFixed(4)
}

/* 读取卡片高度(px), 优先取 dataset.h 缓存 */
export function getCardHeight(card: HTMLElement | null | undefined): number {
  if (!card) return 0
  const cached = Number(card.dataset.h)
  if (Number.isFinite(cached) && cached > 0) return cached
  return card.offsetHeight || 0
}

/* 读取容器列间距, 缺省回退默认值 */
export function readGridGap(container: HTMLElement | null | undefined): number {
  if (!container) return DEFAULT_GRID_GAP
  const gap = Number.parseFloat(getComputedStyle(container).gap)
  return Number.isFinite(gap) && gap > 0 ? gap : DEFAULT_GRID_GAP
}
