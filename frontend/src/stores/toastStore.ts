import { create } from 'zustand'

export interface ToastItem {
  id: string
  title: string
  body: string
  type: 'reminder' | 'info' | 'error' | 'success'
  taskId?: string
  createdAt: number
}

interface ToastState {
  toasts: ToastItem[]
  addToast: (toast: Omit<ToastItem, 'id' | 'createdAt'>) => string
  removeToast: (id: string) => void
}

let counter = 0

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast-${Date.now()}-${++counter}`
    const item: ToastItem = { ...toast, id, createdAt: Date.now() }
    set((state) => ({ toasts: [...state.toasts, item] }))
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, 8000)
    return id
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  },
}))
