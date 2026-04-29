import { useState, useEffect, useCallback } from 'react'
import { backupScheduleApi, type BackupScheduleData } from '../api/backupSchedules'

export function useBackupSchedule() {
  const [schedule, setSchedule] = useState<BackupScheduleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await backupScheduleApi.get()
      setSchedule(data)
    } catch {
      setSchedule(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = useCallback(async (data: {
    enabled?: boolean
    time: string
    period: 'daily' | 'weekly' | 'monthly'
    day_of_week?: number | null
    day_of_month?: number | null
  }) => {
    setSaving(true)
    try {
      if (schedule) {
        const updated = await backupScheduleApi.update(data)
        setSchedule(updated)
      } else {
        const created = await backupScheduleApi.create(data)
        setSchedule(created)
      }
    } finally {
      setSaving(false)
    }
  }, [schedule])

  const remove = useCallback(async () => {
    setSaving(true)
    try {
      await backupScheduleApi.delete()
      setSchedule(null)
    } finally {
      setSaving(false)
    }
  }, [])

  const sendNow = useCallback(async () => {
    setSending(true)
    try {
      await backupScheduleApi.sendNow()
    } finally {
      setSending(false)
    }
  }, [])

  return { schedule, loading, saving, sending, save, remove, sendNow, reload: load }
}
