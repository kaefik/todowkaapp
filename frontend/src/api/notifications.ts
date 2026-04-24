import { httpClient } from './httpClient'

export interface Notification {
  id: string
  user_id: string
  task_id: string | null
  type: string
  message: string
  is_read: boolean
  created_at: string
  delivered_at: string | null
  read_at: string | null
  expires_at: string | null
}

export interface NotificationListResponse {
  items: Notification[]
  total: number
  unread_count: number
}

export const notificationsApi = {
  getAll: async (params?: { unread_only?: boolean; limit?: number; offset?: number }): Promise<NotificationListResponse> => {
    const searchParams = new URLSearchParams()
    if (params?.unread_only !== undefined) searchParams.set('unread_only', String(params.unread_only))
    if (params?.limit !== undefined) searchParams.set('limit', String(params.limit))
    if (params?.offset !== undefined) searchParams.set('offset', String(params.offset))
    const qs = searchParams.toString()
    const response = await httpClient.get<NotificationListResponse>(`/notifications${qs ? `?${qs}` : ''}`)
    return response.data
  },

  markAsRead: async (notificationId: string): Promise<void> => {
    await httpClient.patch(`/notifications/${notificationId}/read`)
  },

  markAllAsRead: async (): Promise<void> => {
    await httpClient.patch('/notifications/read-all')
  },

  deleteNotification: async (notificationId: string): Promise<void> => {
    await httpClient.delete(`/notifications/${notificationId}`)
  },

  deleteReadNotifications: async (): Promise<{ status: string; count: string }> => {
    const response = await httpClient.delete<{ status: string; count: string }>('/notifications/read')
    return response.data
  },
}
