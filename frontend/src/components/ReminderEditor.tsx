import { useState, useEffect } from 'react'

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

const REMINDER_PRESETS = [
  { value: 0, label: 'Во время' },
  { value: 5, label: 'За 5 минут' },
  { value: 15, label: 'За 15 минут' },
  { value: 60, label: 'За 1 час' },
  { value: 1440, label: 'За 1 день' },
]

export function ReminderEditor({
  reminderTime,
  reminderOffsets,
  reminderFired,
  dueDate,
  onChange,
}: ReminderEditorProps) {
  const [enabled, setEnabled] = useState((!!reminderTime || !!reminderOffsets?.length) && !reminderFired)
  const [useTime, setUseTime] = useState(!!reminderTime)
  const [time, setTime] = useState(reminderTime || '09:00')
  const [useOffsets, setUseOffsets] = useState(!!reminderOffsets?.length)
  const [selected, setSelected] = useState<number[]>(reminderOffsets || [])

  const isReminderInPast = useTime && dueDate && time ? (() => {
    const now = new Date()
    const dueDateObj = new Date(dueDate + 'T00:00:00')
    const [hours, minutes] = time.split(':').map(Number)
    const reminderDate = new Date(dueDateObj)
    reminderDate.setHours(hours, minutes, 0, 0)
    return reminderDate < now
  })() : false

  useEffect(() => {
    const hasReminder = (!!reminderTime || !!reminderOffsets?.length) && !reminderFired
    setEnabled(hasReminder)
    setUseTime(!!reminderTime)
    setTime(reminderTime || '09:00')
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
    if (enabled && useTime) {
      onChange({ reminder_time: newTime, reminder_offsets: null })
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
        <div className="space-y-2 pl-6 border-l-2 border-indigo-200 dark:border-indigo-800">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="reminder-type"
              checked={useTime}
              onChange={handleToggleUseTime}
              className="w-4 h-4 text-indigo-600 dark:text-indigo-400 border-gray-300 dark:border-gray-600 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-700"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">В конкретное время</span>
          </label>
          {useTime && (
            <div className="ml-6">
              <input
                type="time"
                value={time}
                onChange={handleTimeChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
              />
              {isReminderInPast && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ Время напоминания в прошлом — напоминание не будет отправлено
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
            <span className="text-sm text-gray-700 dark:text-gray-300">За время до дедлайна</span>
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
