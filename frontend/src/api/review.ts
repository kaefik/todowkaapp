import { httpClient } from './httpClient'

export interface TaskReviewItem {
  id: string
  title: string
  description: string | null
  due_date: string | null
}

export interface ProjectReviewItem {
  id: string
  name: string
  description: string | null
  has_next_action: boolean
  next_actions: TaskReviewItem[]
  available_tasks: TaskReviewItem[]
}

export interface ReviewStatus {
  inbox_count: number
  inbox_tasks: TaskReviewItem[]
  active_projects: ProjectReviewItem[]
  someday_tasks: TaskReviewItem[]
  last_review_date: string | null
  review_count: number
}

export interface ReviewCompleteResponse {
  success: boolean
  review_count: number
  completed_at: string
}

export const reviewApi = {
  getStatus: async (): Promise<ReviewStatus> => {
    const response = await httpClient.get<ReviewStatus>('/review/status')
    return response.data
  },

  complete: async (): Promise<ReviewCompleteResponse> => {
    const response = await httpClient.post<ReviewCompleteResponse>('/review/complete')
    return response.data
  },
}
