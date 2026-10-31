/* ============================================================
   localStorage 读写封装
   统一容错,避免隐私模式或配额异常中断流程
   ============================================================ */

export interface StorageLike {
  read: <T>(key: string, fallback: T) => T
  write: (key: string, value: unknown) => void
  remove: (key: string) => void
}

export function useStorage(): StorageLike {
  function read<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key)
      return raw !== null ? (JSON.parse(raw) as T) : fallback
    } catch {
      return fallback
    }
  }

  function write(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* 配额或权限异常时静默降级 */
    }
  }

  function remove(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch {
      /* 忽略移除异常 */
    }
  }

  return { read, write, remove }
}
