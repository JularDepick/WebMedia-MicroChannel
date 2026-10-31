/* ============================================================
   全局飘窗提示
   以模块级单例承载,避免多处重复创建
   ============================================================ */

const toastMessage = ref('')
const toastVisible = ref(false)
let hideTimer: ReturnType<typeof setTimeout> | null = null

export function useToast() {
  function showToast(message: string, duration = 2000): void {
    toastMessage.value = message
    toastVisible.value = true
    if (hideTimer) clearTimeout(hideTimer)
    hideTimer = setTimeout(() => {
      toastVisible.value = false
      hideTimer = null
    }, duration)
  }

  return {
    toastMessage: readonly(toastMessage),
    toastVisible: readonly(toastVisible),
    showToast
  }
}
