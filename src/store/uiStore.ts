/** 全局提示（Toast）：临时 UI 状态，不做持久化 */
import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  message: string
  type: ToastType
}

interface UiState {
  toasts: ToastItem[]
  pushToast: (message: string, type?: ToastType) => void
  dismissToast: (id: number) => void
}

let toastId = 0

export const useUiStore = create<UiState>()((set, get) => ({
  toasts: [],
  pushToast: (message, type = 'success') => {
    const id = ++toastId
    set({ toasts: [...get().toasts, { id, message, type }] })
    window.setTimeout(() => get().dismissToast(id), 2200)
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((item) => item.id !== id) }),
}))

/** 组件外（异步逻辑、事件回调）也能直接提示 */
export function toast(message: string, type: ToastType = 'success'): void {
  useUiStore.getState().pushToast(message, type)
}
