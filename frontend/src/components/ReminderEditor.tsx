import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface ReminderEditorProps {
  reminderTime: string | null
  reminderOffsets: number[] | null
  reminderFired: boolean
  dueDate: string | null
  onChange: (data: {
    reminder_time: string | null
    reminder_offsets: number[] | null
  }) => void
}

function getDefaultReminderTime(): string {
  const now = new Date()
  now.setHours(now.getHours() + 1, 0, 0, 0)
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

export function ReminderEditor({
  reminderTime,
  reminderOffsets,
  reminderFired,
  dueDate,
  onChange,
}: ReminderEditorProps) {
  const { t } = useTranslation('tasks')
  const hasReminder = !!reminderTime || !!reminderOffsets?.length
  const [enabled, setEnabled] = useState(hasReminder && !reminderFired)
  const [useTime, setUseTime] = useState(!!reminderTime)
  const [time, setTime] = useState(reminderTime || getDefaultReminderTime())
  const [useOffsets, setUseOffsets] = useState(!!reminderOffsets?.length)
  const [selected, setSelected] = useState<number[]>(reminderOffsets || [])

  const REMINDER_PRESETS = [
    { value: 0, label: t('reminderAtTimePreset') },
    { value: 5, label: t('reminder5min') },
    { value: 15, label: t('reminder15min') },
    { value: 60, label: t('reminder1hour') },
    { value: 1440, label: t('reminder1day') },
  ]

  const isReminderInPast = useTime && dueDate && time ? (() => {
    const now = new Date()
    const dueDateObj = new Date(dueDate + 'T00:00:00')
    const parts = time.split(':').map(Number)
    const h = parts[0]
    const m = parts[1]
    if (h == null || m == null) return false
    const reminderDate = new Date(dueDateObj)
    reminderDate.setHours(h, m, 0, 0)
    return reminderDate < now
  })() : false

  useEffect(() => {
    const hasReminder = (!!reminderTime || !!reminderOffsets?.length) && !reminderFired
    setEnabled(hasReminder)
    setUseTime(!!reminderTime)
    if (reminderTime) {
      setTime(reminderTime)
    }
    setUseOffsets(!!reminderOffsets?.length)
    setSelected(reminderOffsets || [])
  }, [reminderTime, reminderOffsets, reminderFired])

  const handleToggleEnabled = () => {
    const next = !enabled
    setEnabled(next)
    if (!next) {
      onChange({ reminder_time: null, reminder_offsets: null })
      setUseTime(false)
      setUseOffsets(false)
    } else {
      setUseTime(true)
      onChange({ reminder_time: time, reminder_offsets: null })
    }
  }

  const handleToggleUseTime = () => {
    setUseTime(true)
    setUseOffsets(false)
    onChange({ reminder_time: time, reminder_offsets: null })
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value
    setTime(newTime)
  }

  const handleTimeBlur = () => {
    if (enabled && useTime && time) {
      onChange({ reminder_time: time, reminder_offsets: null })
    }
  }

  const handleToggleUseOffsets = () => {
    setUseTime(false)
    setUseOffsets(true)
    const offsets = selected.length > 0 ? selected : [0]
    setSelected(offsets)
    onChange({ reminder_time: null, reminder_offsets: [...offsets].sort((a, b) => a - b) })
  }

  const handleTogglePreset = (value: number) => {
    setSelected(prev => {
      const next = prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
      if (enabled && useOffsets) {
        if (next.length === 0) {
          onChange({ reminder_time: null, reminder_offsets: null })
        } else {
          onChange({ reminder_time: null, reminder_offsets: [...next].sort((a, b) => a - b) })
        }
      }
      return next
    })
  }

  return (
    <div className="space-y-3">
      {reminderFired && hasReminder && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700">
          <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm text-amber-700 dark:text-amber-300">
            {t('reminderFired')}
          </span>
        </div>
      )}

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={handleToggleEnabled}
          className="w-4 h-4 text-indigo-600 dark:text-indigo-400 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-700"
        />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('reminder')}
        </span>
      </label>

      {enabled && (
        <div className="space-y-2 pl-6 border-l-2 border-indigo-200 dark:border-indigo-800">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="reminder-type"
              checked={useTime}
              onChange={handleToggleUseTime}
              className="w-4 h-4 text-indigo-600 dark:text-indigo-400 border-gray-300 dark:border-gray-600 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-700"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">{t('reminderAtTime')}</span>
          </label>
          {useTime && (
            <div className="ml-6">
              <input
                type="time"
                value={time}
                onChange={handleTimeChange}
                onBlur={handleTimeBlur}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
              />
              {isReminderInPast && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  {t('reminderTimeInPast')}
                </p>
              )}
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="reminder-type"
              checked={useOffsets}
              onChange={handleToggleUseOffsets}
              className="w-4 h-4 text-indigo-600 dark:text-indigo-400 border-gray-300 dark:border-gray-600 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-700"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">{t('reminderBeforeDeadline')}</span>
          </label>
          {useOffsets && (
            <div className="ml-6 space-y-2">
              {REMINDER_PRESETS.map(preset => {
                const active = selected.includes(preset.value)
                return (
                  <label key={preset.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => handleTogglePreset(preset.value)}
                      className="w-4 h-4 text-indigo-600 dark:text-indigo-400 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-700"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{preset.label}</span>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
