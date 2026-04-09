import { httpClient } from './httpClient'

export interface User {
  id: string
  username: string
  email: string
  is_active: boolean
  is_admin: boolean
  is_blocked: boolean
  created_at: string
}

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const response = await httpClient.get<User[]>('/users')
    return response.data
  },

  blockUser: async (userId: string): Promise<User> => {
    const response = await httpClient.patch<User>(`/users/${userId}/block`)
    return response.data
  },

  unblockUser: async (userId: string): Promise<User> => {
    const response = await httpClient.patch<User>(`/users/${userId}/unblock`)
    return response.data
  },

  deleteUser: async (userId: string): Promise<void> => {
    await httpClient.delete(`/users/${userId}`)
  },
}
