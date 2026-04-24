import { httpClient } from './httpClient'

export interface ApiVerbTemplate {
  id: string
  user_id: string
  text: string
  icon: string
  position: number
  created_at: string
  updated_at: string
}

export const verbTemplatesApi = {
  getAll: async (): Promise<ApiVerbTemplate[]> => {
    const response = await httpClient.get<{ items: ApiVerbTemplate[]; total: number }>('/verb-templates')
    return response.data.items
  },

  create: async (data: { text: string; icon: string }): Promise<ApiVerbTemplate> => {
    const response = await httpClient.post<ApiVerbTemplate>('/verb-templates', data)
    return response.data
  },

  update: async (id: string, data: { text?: string; icon?: string }): Promise<ApiVerbTemplate> => {
    const response = await httpClient.put<ApiVerbTemplate>(`/verb-templates/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await httpClient.delete(`/verb-templates/${id}`)
  },

  reorder: async (ids: string[]): Promise<ApiVerbTemplate[]> => {
    const response = await httpClient.put<ApiVerbTemplate[]>('/verb-templates/reorder', { ids })
    return response.data
  },

  reset: async (): Promise<ApiVerbTemplate[]> => {
    const response = await httpClient.post<ApiVerbTemplate[]>('/verb-templates/reset')
    return response.data
  },
}
