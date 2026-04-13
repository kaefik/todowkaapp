import { useState, useEffect, useRef } from 'react'

interface ReminderEditorProps {
  reminderOffsets: number[] | null
  onChange: (data: {
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
  reminderOffsets,
  onChange,
}: ReminderEditorProps) {
  const [enabled, setEnabled] = useState(!!reminderOffsets?.length)
  const [selected, setSelected] = useState<number[]>(reminderOffsets || [])

  const initialized = useRef(false)

  const emitChange = () => {
    if (!enabled || selected.length === 0) {
      onChange({ reminder_offsets: null })
      return
    }
    onChange({ reminder_offsets: [...selected].sort((a, b) => a - b) })
  }

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    emitChange()
  })

  const handleToggleEnabled = () => {
    const next = !enabled
    setEnabled(next)
    if (!next) {
      onChange({ reminder_offsets: null })
    } else if (selected.length > 0) {
      onChange({ reminder_offsets: [...selected].sort((a, b) => a - b) })
    } else {
      onChange({ reminder_offsets: null })
    }
  }

  const handleTogglePreset = (value: number) => {
    setSelected(prev => {
      const next = prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
      if (!enabled || next.length === 0) {
        onChange({ reminder_offsets: null })
      } else {
        onChange({ reminder_offsets: [...next].sort((a, b) => a - b) })
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
  )
}
