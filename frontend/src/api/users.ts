import { httpClient } from './httpClient'

export interface User {
  id: string
  username: string
  email: string
  is_active: boolean
  is_admin: boolean
  timezone: string | null
  default_section: string
  language: string | null
  telegram_bot_token: string | null
  telegram_chat_id: string | null
  telegram_notifications_enabled: boolean
  capitalize_first: boolean
  created_at: string
  last_login_at: string | null
  last_review_at: string | null
  review_count: number
  review_frequency_days: number
  review_notifications_enabled: boolean
  email_notifications_enabled: boolean
  notification_email: string | null
  email_verified_at: string | null
}

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const response = await httpClient.get<User[]>('/users')
    return response.data
  },

  updateCurrentUser: async (data: Partial<Pick<User, 'username' | 'email' | 'timezone' | 'default_section' | 'language' | 'telegram_bot_token' | 'telegram_notifications_enabled' | 'capitalize_first' | 'review_frequency_days' | 'review_notifications_enabled' | 'email_notifications_enabled'>>): Promise<User> => {
    const response = await httpClient.patch<User>('/users/me', data)
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

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const response = await httpClient.post<{ message: string }>('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    })
    return response.data
  },

  deleteAccount: async (password: string): Promise<{ message: string }> => {
    const response = await httpClient.request<{ message: string }>({
      method: 'DELETE',
      url: '/auth/delete-account',
      data: { password },
    })
    return response.data
  },

  validateTelegramToken: async (token: string): Promise<{ valid: boolean; bot_username?: string; bot_name?: string; error?: string }> => {
    const response = await httpClient.post('/users/telegram/validate-token', {
      telegram_bot_token: token,
    })
    return response.data as { valid: boolean; bot_username?: string; bot_name?: string; error?: string }
  },

  verifyEmail: async (email: string): Promise<{ message: string }> => {
    const response = await httpClient.post<{ message: string }>('/users/verify-email', { email })
    return response.data
  },

  confirmEmail: async (code: string): Promise<{ message: string; notification_email: string }> => {
    const response = await httpClient.post<{ message: string; notification_email: string }>('/users/confirm-email', { code })
    return response.data
  },

  getSmtpSettings: async (): Promise<{ smtp_host: string | null; smtp_port: number | null; smtp_user: string | null; smtp_from: string | null; smtp_configured: boolean }> => {
    const response = await httpClient.get<{ smtp_host: string | null; smtp_port: number | null; smtp_user: string | null; smtp_from: string | null; smtp_configured: boolean }>('/settings/smtp')
    return response.data
  },

  updateSmtpSettings: async (data: { smtp_host: string | null; smtp_port: number | null; smtp_user: string | null; smtp_password: string | null; smtp_from: string | null }): Promise<{ smtp_host: string | null; smtp_port: number | null; smtp_user: string | null; smtp_from: string | null; smtp_configured: boolean }> => {
    const response = await httpClient.put<{ smtp_host: string | null; smtp_port: number | null; smtp_user: string | null; smtp_from: string | null; smtp_configured: boolean }>('/settings/smtp', data)
    return response.data
  },
}
