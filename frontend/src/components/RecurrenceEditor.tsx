import { useState, useEffect } from 'react'
import type { RecurrenceConfig } from '../hooks/useTasks'

interface RecurrenceEditorProps {
  recurrenceType: string | null
  recurrenceConfig: RecurrenceConfig | null
  recurrenceEndDate: string | null
  dueDate: string | null
  onChange: (data: {
    recurrence_type: string | null
    recurrence_config: RecurrenceConfig | null
    recurrence_end_date: string | null
  }) => void
}

const RECURRENCE_TYPES = [
  { value: 'daily', label: 'Ежедневно' },
  { value: 'weekly', label: 'Еженедельно' },
  { value: 'monthly', label: 'Ежемесячно' },
]

const WEEKDAYS = [
  { value: 1, label: 'Пн' },
  { value: 2, label: 'Вт' },
  { value: 3, label: 'Ср' },
  { value: 4, label: 'Чт' },
  { value: 5, label: 'Пт' },
  { value: 6, label: 'Сб' },
  { value: 7, label: 'Вс' },
]

const WEEK_OF_MONTH_LABELS = ['Первый', 'Второй', 'Третий', 'Четвёртый']
const DAY_OF_WEEK_LABELS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']

const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400'
const selectClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400'
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'

function getIntervalLabel(type: string, interval: number): string {
  if (type === 'daily') {
    if (interval === 1) return 'каждый день'
    return `каждые ${interval} дней`
  }
  if (type === 'weekly') {
    if (interval === 1) return 'каждую неделю'
    return `каждые ${interval} недель`
  }
  if (interval === 1) return 'каждый месяц'
  return `каждые ${interval} месяцев`
}

export function RecurrenceEditor({
  recurrenceType,
  recurrenceConfig,
  recurrenceEndDate,
  dueDate,
  onChange,
}: RecurrenceEditorProps) {
  const [enabled, setEnabled] = useState(!!recurrenceType)
  const [type, setType] = useState<string>(recurrenceType || 'daily')
  const [interval, setIntervalValue] = useState(recurrenceConfig?.interval || 1)
  const [selectedDays, setSelectedDays] = useState<number[]>(recurrenceConfig?.days || [])
  const [monthlyMode, setMonthlyMode] = useState<'day' | 'weekday'>(
    recurrenceConfig?.week_of_month ? 'weekday' : 'day'
  )
  const [dayOfMonth, setDayOfMonth] = useState(recurrenceConfig?.day_of_month || 1)
  const [weekOfMonth, setWeekOfMonth] = useState(recurrenceConfig?.week_of_month || 1)
  const [dayOfWeek, setDayOfWeek] = useState(recurrenceConfig?.day_of_week || 1)
  const [endType, setEndType] = useState<'never' | 'on_date'>(recurrenceEndDate ? 'on_date' : 'never')
  const [endDate, setEndDate] = useState(recurrenceEndDate ? recurrenceEndDate.slice(0, 10) : '')

  useEffect(() => {
    setEnabled(!!recurrenceType)
    setType(recurrenceType || 'daily')
    setIntervalValue(recurrenceConfig?.interval || 1)
    setSelectedDays(recurrenceConfig?.days || [])
    setMonthlyMode(recurrenceConfig?.week_of_month ? 'weekday' : 'day')
    setDayOfMonth(recurrenceConfig?.day_of_month || 1)
    setWeekOfMonth(recurrenceConfig?.week_of_month || 1)
    setDayOfWeek(recurrenceConfig?.day_of_week || 1)
    setEndType(recurrenceEndDate ? 'on_date' : 'never')
    setEndDate(recurrenceEndDate ? recurrenceEndDate.slice(0, 10) : '')
  }, [recurrenceType, recurrenceConfig, recurrenceEndDate])

  const handleToggleEnabled = () => {
    const next = !enabled
    setEnabled(next)
    if (!next) {
      onChange({
        recurrence_type: null,
        recurrence_config: null,
        recurrence_end_date: null,
      })
    } else {
      emitChangeWith({ enabled: next })
    }
  }

  const emitChangeWith = (overrides: Partial<{
    enabled: boolean
    type: string
    interval: number
    selectedDays: number[]
    monthlyMode: 'day' | 'weekday'
    dayOfMonth: number
    weekOfMonth: number
    dayOfWeek: number
    endType: 'never' | 'on_date'
    endDate: string
  }>) => {
    const e = overrides.enabled ?? enabled
    if (!e) {
      onChange({ recurrence_type: null, recurrence_config: null, recurrence_end_date: null })
      return
    }

    const t = overrides.type ?? type
    const iv = overrides.interval ?? interval
    const sd = overrides.selectedDays ?? selectedDays
    const mm = overrides.monthlyMode ?? monthlyMode
    const dom = overrides.dayOfMonth ?? dayOfMonth
    const wom = overrides.weekOfMonth ?? weekOfMonth
    const dow = overrides.dayOfWeek ?? dayOfWeek
    const et = overrides.endType ?? endType
    const ed = overrides.endDate ?? endDate

    const config: RecurrenceConfig = {
      type: t as RecurrenceConfig['type'],
      interval: iv,
    }

    if (t === 'weekly') {
      config.days = sd.length > 0 ? sd : [1]
    } else if (t === 'monthly') {
      if (mm === 'day') {
        config.day_of_month = dom
      } else {
        config.week_of_month = wom
        config.day_of_week = dow
      }
    }

    onChange({
      recurrence_type: t,
      recurrence_config: config,
      recurrence_end_date: et === 'on_date' && ed ? `${ed}T00:00:00Z` : null,
    })
  }

  const handleTypeChange = (newType: string) => {
    setType(newType)
    emitChangeWith({ type: newType })
  }

  const handleIntervalChange = (newInterval: number) => {
    setIntervalValue(newInterval)
    emitChangeWith({ interval: newInterval })
  }

  const handleDayToggle = (day: number) => {
    const next = selectedDays.includes(day)
      ? selectedDays.filter(d => d !== day)
      : [...selectedDays, day]
    setSelectedDays(next)
    emitChangeWith({ selectedDays: next })
  }

  const handleMonthlyModeChange = (mode: 'day' | 'weekday') => {
    setMonthlyMode(mode)
    emitChangeWith({ monthlyMode: mode })
  }

  const handleDayOfMonthChange = (day: number) => {
    setDayOfMonth(day)
    emitChangeWith({ dayOfMonth: day })
  }

  const handleWeekOfMonthChange = (week: number) => {
    setWeekOfMonth(week)
    emitChangeWith({ weekOfMonth: week })
  }

  const handleDayOfWeekChange = (day: number) => {
    setDayOfWeek(day)
    emitChangeWith({ dayOfWeek: day })
  }

  const handleEndTypeChange = (newEndType: 'never' | 'on_date') => {
    setEndType(newEndType)
    emitChangeWith({ endType: newEndType })
  }

  const handleEndDateChange = (newEndDate: string) => {
    setEndDate(newEndDate)
    emitChangeWith({ endDate: newEndDate })
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={handleToggleEnabled}
          disabled={!dueDate}
          className="w-4 h-4 text-indigo-600 dark:text-indigo-400 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Повторяющаяся задача
        </span>
      </label>
      {!dueDate && (
        <p className="text-xs text-amber-600 dark:text-amber-400 pl-6">
          Для настройки повторения необходимо указать дедлайн
        </p>
      )}

      {enabled && (
        <div className="space-y-3 pl-6 border-l-2 border-indigo-200 dark:border-indigo-800">
          <div>
            <label className={labelClass}>Тип повторения</label>
            <select
              value={type}
              onChange={e => handleTypeChange(e.target.value)}
              className={selectClass}
            >
              {RECURRENCE_TYPES.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              Интервал — {getIntervalLabel(type, interval)}
            </label>
            <input
              type="number"
              min={1}
              max={365}
              value={interval}
              onChange={e => handleIntervalChange(Math.max(1, parseInt(e.target.value) || 1))}
              className={inputClass}
            />
          </div>

          {type === 'weekly' && (
            <div>
              <label className={labelClass}>Дни недели</label>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map(day => {
                  const active = selectedDays.includes(day.value)
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => handleDayToggle(day.value)}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        active
                          ? 'bg-indigo-600 dark:bg-indigo-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {day.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {type === 'monthly' && (
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Способ</label>
                <select
                  value={monthlyMode}
                  onChange={e => handleMonthlyModeChange(e.target.value as 'day' | 'weekday')}
                  className={selectClass}
                >
                  <option value="day">По числу месяца</option>
                  <option value="weekday">По дню недели</option>
                </select>
              </div>

              {monthlyMode === 'day' && (
                <div>
                  <label className={labelClass}>Число месяца</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={dayOfMonth}
                    onChange={e => handleDayOfMonthChange(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                    className={inputClass}
                  />
                </div>
              )}

              {monthlyMode === 'weekday' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Неделя</label>
                    <select
                      value={weekOfMonth}
                      onChange={e => handleWeekOfMonthChange(parseInt(e.target.value))}
                      className={selectClass}
                    >
                      {WEEK_OF_MONTH_LABELS.map((label, i) => (
                        <option key={i} value={i + 1}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>День недели</label>
                    <select
                      value={dayOfWeek}
                      onChange={e => handleDayOfWeekChange(parseInt(e.target.value))}
                      className={selectClass}
                    >
                      {DAY_OF_WEEK_LABELS.map((label, i) => (
                        <option key={i} value={i + 1}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className={labelClass}>Окончание</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="recurrence-end"
                  checked={endType === 'never'}
                  onChange={() => handleEndTypeChange('never')}
                  className="w-4 h-4 text-indigo-600 dark:text-indigo-400 border-gray-300 dark:border-gray-600 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Никогда</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="recurrence-end"
                  checked={endType === 'on_date'}
                  onChange={() => handleEndTypeChange('on_date')}
                  className="w-4 h-4 text-indigo-600 dark:text-indigo-400 border-gray-300 dark:border-gray-600 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Дата:</span>
              </label>
              {endType === 'on_date' && (
                <input
                  type="date"
                  value={endDate}
                  onChange={e => handleEndDateChange(e.target.value)}
                  className={inputClass}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
