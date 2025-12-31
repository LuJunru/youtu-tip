import { create } from 'zustand'

interface Toast {
  id: number
  message: string
  type?: 'info' | 'error' | 'success'
}

interface ToastState {
  toasts: Toast[]
  pushToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: number) => void
}

let toastCounter = 0

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  pushToast: (toast) => {
    const id = ++toastCounter
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }))
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, 4000)
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))
