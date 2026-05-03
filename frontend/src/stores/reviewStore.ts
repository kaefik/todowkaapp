import { create } from 'zustand'
import { reviewApi, type ReviewStatus, type ReviewSummary } from '../api/review'

export type ReviewStep = 'dashboard' | 'inbox' | 'overdue' | 'projects' | 'someday' | 'completion'

export interface ReviewStats {
  inboxProcessed: number
  nextActionsAdded: number
  somedayActivated: number
  overdueProcessed: number
}

export interface SectionProgress {
  processed: number
  total: number
}

interface ReviewState {
  currentStep: ReviewStep
  data: ReviewStatus | null
  summary: ReviewSummary | null
  isLoading: boolean
  error: string | null
  stats: ReviewStats
  inboxProgress: SectionProgress
  somedayProgress: SectionProgress
  projectsProgress: SectionProgress
  overdueProgress: SectionProgress
  fetchSummary: () => Promise<void>
  fetchData: () => Promise<void>
  setStep: (step: ReviewStep) => void
  incrementInboxProcessed: () => void
  incrementSomedayProcessed: () => void
  incrementSomedayActivated: () => void
  incrementNextActionsAdded: () => void
  incrementOverdueProcessed: () => void
  markProjectReviewed: () => void
  resetStats: () => void
}

const initialStats: ReviewStats = {
  inboxProcessed: 0,
  nextActionsAdded: 0,
  somedayActivated: 0,
  overdueProcessed: 0,
}

const initialProgress: SectionProgress = { processed: 0, total: 0 }

export const useReviewStore = create<ReviewState>()((set) => ({
  currentStep: 'dashboard',
  data: null,
  summary: null,
  isLoading: false,
  error: null,
  stats: { ...initialStats },
  inboxProgress: { ...initialProgress },
  somedayProgress: { ...initialProgress },
  projectsProgress: { ...initialProgress },
  overdueProgress: { ...initialProgress },

  fetchSummary: async () => {
    set({ isLoading: true, error: null })
    try {
      const summary = await reviewApi.getSummary()
      set({ summary, isLoading: false })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch review summary',
      })
    }
  },

  fetchData: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await reviewApi.getStatus()
      set({
        data,
        isLoading: false,
        inboxProgress: { processed: 0, total: data.inbox_tasks.length },
        somedayProgress: { processed: 0, total: data.someday_tasks.length },
        projectsProgress: { processed: 0, total: data.active_projects.length },
        overdueProgress: { processed: 0, total: data.overdue_tasks.length },
      })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch review data',
      })
    }
  },

  setStep: (step) => set({ currentStep: step }),

  incrementInboxProcessed: () =>
    set((state) => ({
      inboxProgress: { ...state.inboxProgress, processed: state.inboxProgress.processed + 1 },
      stats: { ...state.stats, inboxProcessed: state.stats.inboxProcessed + 1 },
    })),

  incrementSomedayProcessed: () =>
    set((state) => ({
      somedayProgress: { ...state.somedayProgress, processed: state.somedayProgress.processed + 1 },
    })),

  incrementSomedayActivated: () =>
    set((state) => ({
      somedayProgress: { ...state.somedayProgress, processed: state.somedayProgress.processed + 1 },
      stats: { ...state.stats, somedayActivated: state.stats.somedayActivated + 1 },
    })),

  incrementNextActionsAdded: () =>
    set((state) => ({
      stats: { ...state.stats, nextActionsAdded: state.stats.nextActionsAdded + 1 },
    })),

  incrementOverdueProcessed: () =>
    set((state) => ({
      overdueProgress: { ...state.overdueProgress, processed: state.overdueProgress.processed + 1 },
      stats: { ...state.stats, overdueProcessed: state.stats.overdueProcessed + 1 },
    })),

  markProjectReviewed: () =>
    set((state) => ({
      projectsProgress: { ...state.projectsProgress, processed: state.projectsProgress.processed + 1 },
    })),

  resetStats: () =>
    set({
      currentStep: 'dashboard',
      data: null,
      summary: null,
      isLoading: false,
      error: null,
      stats: { ...initialStats },
      inboxProgress: { ...initialProgress },
      somedayProgress: { ...initialProgress },
      projectsProgress: { ...initialProgress },
      overdueProgress: { ...initialProgress },
    }),
}))
