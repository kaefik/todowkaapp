import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useBackupSchedule } from '../hooks/useBackupSchedule'
import { useToastStore } from '../stores/toastStore'
import type { User } from '../api/users'

interface Props {
  user: User
}

const DAYS_OF_WEEK = [
  { value: 1, key: 'backupDayOfWeekMon' },
  { value: 2, key: 'backupDayOfWeekTue' },
  { value: 3, key: 'backupDayOfWeekWed' },
  { value: 4, key: 'backupDayOfWeekThu' },
  { value: 5, key: 'backupDayOfWeekFri' },
  { value: 6, key: 'backupDayOfWeekSat' },
  { value: 7, key: 'backupDayOfWeekSun' },
] as const

export function BackupScheduleSettings({ user }: Props) {
  const { t } = useTranslation('settings')
  const { schedule, loading, saving, sending, save, sendNow, reload } = useBackupSchedule()
  const addToast = useToastStore((s) => s.addToast)

  const [enabled, setEnabled] = useState(schedule?.enabled ?? true)
  const [time, setTime] = useState(schedule?.time ?? '03:00')
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>(schedule?.period ?? 'daily')
  const [dayOfWeek, setDayOfWeek] = useState(schedule?.day_of_week ?? 1)
  const [dayOfMonth, setDayOfMonth] = useState(schedule?.day_of_month ?? 1)

  useEffect(() => {
    if (schedule) {
      setEnabled(schedule.enabled)
      setTime(schedule.time)
      setPeriod(schedule.period)
      setDayOfWeek(schedule.day_of_week ?? 1)
      setDayOfMonth(schedule.day_of_month ?? 1)
    }
  }, [schedule])

  const telegramConnected = !!(user.telegram_bot_token && user.telegram_chat_id)

  const handleSave = async () => {
    try {
      await save({
        enabled,
        time,
        period,
        day_of_week: period === 'weekly' ? dayOfWeek : null,
        day_of_month: period === 'monthly' ? dayOfMonth : null,
      })
      addToast({ title: t('backupSaved'), body: '', type: 'success' })
      reload()
    } catch {
      addToast({ title: t('backupSaveError'), body: '', type: 'error' })
    }
  }

  const handleSendNow = async () => {
    try {
      await sendNow()
      addToast({ title: t('backupSent'), body: '', type: 'success' })
    } catch {
      addToast({ title: t('backupError'), body: '', type: 'error' })
    }
  }

  if (!telegramConnected) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('backupTitle')}</h2>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
          <p className="text-yellow-700 dark:text-yellow-300">{t('backupTelegramRequired')}</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('backupTitle')}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('backupDescription')}</p>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('backupEnable')}</span>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              enabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('backupTime')}
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('backupPeriod')}
          </label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'daily' | 'weekly' | 'monthly')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="daily">{t('backupPeriodDaily')}</option>
            <option value="weekly">{t('backupPeriodWeekly')}</option>
            <option value="monthly">{t('backupPeriodMonthly')}</option>
          </select>
        </div>

        {period === 'weekly' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('backupDayOfWeek')}
            </label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              {DAYS_OF_WEEK.map((d) => (
                <option key={d.value} value={d.value}>{t(d.key)}</option>
              ))}
            </select>
          </div>
        )}

        {period === 'monthly' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('backupDayOfMonth')}
            </label>
            <input
              type="number"
              min={1}
              max={31}
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        )}

        {schedule?.last_sent_at && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('backupLastSent')} {new Date(schedule.last_sent_at).toLocaleString()}
          </p>
        )}

        {!schedule?.last_sent_at && schedule && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('backupNeverSent')}</p>
        )}

        {schedule && (
          <p className="text-xs text-gray-400 dark:text-gray-500">{t('backupNextSend')}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
          >
            {saving ? '...' : t('saveChanges')}
          </button>

          {telegramConnected && (
            <button
              onClick={handleSendNow}
              disabled={sending}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 text-sm font-medium"
            >
              {sending ? t('backupSending') : t('backupSendNow')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
