import { httpClient } from './httpClient'

export interface TaskReviewItem {
  id: string
  title: string
  description: string | null
  due_date: string | null
  created_at: string | null
}

export interface ProjectReviewItem {
  id: string
  name: string
  description: string | null
  has_next_action: boolean
  days_without_next: number
  next_actions: TaskReviewItem[]
  available_tasks: TaskReviewItem[]
}

export interface ReviewAlert {
  severity: 'red' | 'yellow'
  message: string
  project_id: string | null
}

export interface ReviewSummary {
  inbox_count: number
  overdue_count: number
  done_this_week: number
  stale_count: number
  someday_count: number
  projects_without_next: number
  health_status: 'ok' | 'attention' | 'problems'
  last_review_date: string | null
  review_count: number
  review_frequency_days: number
  week_activity: Record<string, number>
  alerts: ReviewAlert[]
}

export interface OverdueTaskItem {
  id: string
  title: string
  description: string | null
  due_date: string | null
  gtd_status: string
  project_name: string | null
}

export interface ReviewStatus {
  inbox_count: number
  inbox_tasks: TaskReviewItem[]
  overdue_tasks: OverdueTaskItem[]
  active_projects: ProjectReviewItem[]
  someday_tasks: TaskReviewItem[]
  last_review_date: string | null
  review_count: number
}

export interface ReviewCompleteRequest {
  inbox_processed: number
  next_actions_added: number
  someday_activated: number
}

export interface ReviewCompleteResponse {
  success: boolean
  review_count: number
  completed_at: string
  snapshot_health: string | null
}

export const reviewApi = {
  getSummary: async (): Promise<ReviewSummary> => {
    const response = await httpClient.get<ReviewSummary>('/review/summary')
    return response.data
  },

  getStatus: async (): Promise<ReviewStatus> => {
    const response = await httpClient.get<ReviewStatus>('/review/status')
    return response.data
  },

  complete: async (stats?: ReviewCompleteRequest): Promise<ReviewCompleteResponse> => {
    const response = await httpClient.post<ReviewCompleteResponse>('/review/complete', stats)
    return response.data
  },
}
