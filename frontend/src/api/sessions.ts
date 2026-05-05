import { httpClient } from './httpClient'

export interface SessionData {
  id: string
  browser: string
  os: string
  device_type: string
  ip_address: string
  created_at: string
  last_activity: string
  is_current: boolean
}

export interface SessionListResponse {
  items: SessionData[]
}

export const sessionsApi = {
  getSessions: async (currentSessionId?: string): Promise<SessionData[]> => {
    const params = currentSessionId ? `?current_session_id=${encodeURIComponent(currentSessionId)}` : ''

    const response = await httpClient.get<SessionListResponse>(`/sessions${params}`)
    if (response.data && Array.isArray(response.data.items)) {
      return response.data.items
    }
    if (Array.isArray(response.data)) {
      return response.data
    }
    console.warn('Unexpected sessions response:', response.data)
    return []
  },

  revokeSession: async (sessionId: string): Promise<void> => {
    await httpClient.delete(`/sessions/${sessionId}`)
  },

  revokeAllSessions: async (currentSessionId: string): Promise<void> => {
    await httpClient.request({
      method: 'DELETE',
      url: '/sessions',
      data: { current_session_id: currentSessionId },
    })
  },
}
