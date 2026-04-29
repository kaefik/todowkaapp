import { httpClient } from './httpClient'

export interface BackupScheduleData {
  id: string
  user_id: string
  enabled: boolean
  time: string
  period: 'daily' | 'weekly' | 'monthly'
  day_of_week: number | null
  day_of_month: number | null
  last_sent_at: string | null
  created_at: string
  updated_at: string
}

export interface BackupScheduleCreate {
  enabled?: boolean
  time: string
  period: 'daily' | 'weekly' | 'monthly'
  day_of_week?: number | null
  day_of_month?: number | null
}

export interface BackupScheduleUpdate {
  enabled?: boolean | null
  time?: string | null
  period?: 'daily' | 'weekly' | 'monthly' | null
  day_of_week?: number | null
  day_of_month?: number | null
}

export const backupScheduleApi = {
  async get(): Promise<BackupScheduleData | null> {
    const response = await httpClient.get<BackupScheduleData>('/backup-schedule')
    return response.data
  },

  async create(data: BackupScheduleCreate): Promise<BackupScheduleData> {
    const response = await httpClient.post<BackupScheduleData>('/backup-schedule', data)
    return response.data
  },

  async update(data: BackupScheduleUpdate): Promise<BackupScheduleData> {
    const response = await httpClient.put<BackupScheduleData>('/backup-schedule', data)
    return response.data
  },

  async delete(): Promise<void> {
    await httpClient.delete('/backup-schedule')
  },

  async sendNow(): Promise<{ status: string; sent_at: string }> {
    const response = await httpClient.post<{ status: string; sent_at: string }>('/backup-schedule/send-now')
    return response.data
  },
}
