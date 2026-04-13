import { useState, useEffect, useRef } from 'react'

interface ReminderEditorProps {
  reminderTime: string | null
  reminderDaysBefore: number | null
  onChange: (data: {
    reminder_time: string | null
    reminder_days_before: number | null
  }) => void
}

const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400'
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'

export function ReminderEditor({
  reminderTime,
  reminderDaysBefore,
  onChange,
}: ReminderEditorProps) {
  const [enabled, setEnabled] = useState(!!reminderTime)
  const [time, setTime] = useState(reminderTime || '09:00')
  const [daysBefore, setDaysBefore] = useState(reminderDaysBefore ?? 1)

  const initialized = useRef(false)

  const emitChange = () => {
    if (!enabled) {
      onChange({ reminder_time: null, reminder_days_before: null })
      return
    }
    onChange({ reminder_time: time, reminder_days_before: daysBefore })
  }

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    emitChange()
  })

  const emitChangeWith = (overrides: Partial<{
    enabled: boolean
    time: string
    daysBefore: number
  }>) => {
    const e = overrides.enabled ?? enabled
    if (!e) {
      onChange({ reminder_time: null, reminder_days_before: null })
      return
    }
    const t = overrides.time ?? time
    const d = overrides.daysBefore ?? daysBefore
    onChange({ reminder_time: t, reminder_days_before: d })
  }

  const handleToggleEnabled = () => {
    const next = !enabled
    setEnabled(next)
    if (!next) {
      onChange({ reminder_time: null, reminder_days_before: null })
    } else {
      emitChangeWith({ enabled: next })
    }
  }

  const handleTimeChange = (newTime: string) => {
    setTime(newTime)
    emitChangeWith({ time: newTime })
  }

  const handleDaysBeforeChange = (newDays: number) => {
    const val = Math.max(0, Math.min(365, newDays))
    setDaysBefore(val)
    emitChangeWith({ daysBefore: val })
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={handleToggleEnabled}
          className="w-4 h-4 text-indigo-600 dark:text-indigo-400 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-700"
        />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Напоминание
        </span>
      </label>

      {enabled && (
        <div className="space-y-3 pl-6 border-l-2 border-indigo-200 dark:border-indigo-800">
          <div>
            <label className={labelClass}>Время напоминания</label>
            <input
              type="time"
              value={time}
              onChange={e => handleTimeChange(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Напомнить за {daysBefore} {daysBefore === 1 ? 'день' : daysBefore < 5 ? 'дня' : 'дней'} до дедлайна
            </label>
            <input
              type="number"
              min={0}
              max={365}
              value={daysBefore}
              onChange={e => handleDaysBeforeChange(parseInt(e.target.value) || 0)}
              className={inputClass}
            />
          </div>
        </div>
      )}
    </div>
  )
}
