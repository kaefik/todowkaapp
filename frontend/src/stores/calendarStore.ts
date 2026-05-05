import { create } from 'zustand'

export type CalendarViewType = 'day' | 'week' | 'month' | 'year'

interface CalendarState {
  view: CalendarViewType
  currentDate: Date
  selectedDate: Date | null
  detailDrawerOpen: boolean
  selectedTaskId: number | null
  setView: (view: CalendarViewType) => void
  setCurrentDate: (date: Date) => void
  goToday: () => void
  goNext: () => void
  goPrev: () => void
  openDetailDrawer: (date: Date) => void
  closeDetailDrawer: () => void
  openTaskDetail: (taskId: number) => void
  closeTaskDetail: () => void
}

function getSavedView(): CalendarViewType {
  try {
    const saved = localStorage.getItem('calendar-view')
    if (saved === 'day' || saved === 'week' || saved === 'month' || saved === 'year') return saved
  } catch {}
  return 'month'
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  view: getSavedView(),
  currentDate: new Date(),
  selectedDate: null,
  detailDrawerOpen: false,
  selectedTaskId: null,

  setView: (view) => {
    localStorage.setItem('calendar-view', view)
    set({ view })
  },

  setCurrentDate: (date) => set({ currentDate: date }),

  goToday: () => set({ currentDate: new Date() }),

  goNext: () => {
    const { view, currentDate } = get()
    const d = new Date(currentDate)
    if (view === 'day') d.setDate(d.getDate() + 1)
    else if (view === 'week') d.setDate(d.getDate() + 7)
    else if (view === 'month') d.setMonth(d.getMonth() + 1)
    else if (view === 'year') d.setFullYear(d.getFullYear() + 1)
    set({ currentDate: d })
  },

  goPrev: () => {
    const { view, currentDate } = get()
    const d = new Date(currentDate)
    if (view === 'day') d.setDate(d.getDate() - 1)
    else if (view === 'week') d.setDate(d.getDate() - 7)
    else if (view === 'month') d.setMonth(d.getMonth() - 1)
    else if (view === 'year') d.setFullYear(d.getFullYear() - 1)
    set({ currentDate: d })
  },

  openDetailDrawer: (date) => set({ selectedDate: date, detailDrawerOpen: true }),
  closeDetailDrawer: () => set({ detailDrawerOpen: false, selectedDate: null }),
  openTaskDetail: (taskId) => set({ selectedTaskId: taskId }),
  closeTaskDetail: () => set({ selectedTaskId: null }),
}))
