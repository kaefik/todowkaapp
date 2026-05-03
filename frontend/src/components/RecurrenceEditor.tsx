import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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

const RECURRENCE_TYPE_KEYS = [
  { value: 'daily', labelKey: 'recurrenceDaily' },
  { value: 'weekly', labelKey: 'recurrenceWeekly' },
  { value: 'monthly', labelKey: 'recurrenceMonthly' },
  { value: 'yearly', labelKey: 'recurrenceYearly' },
] as const

const WEEKDAY_KEYS = [
  { value: 1, labelKey: 'mon' },
  { value: 2, labelKey: 'tue' },
  { value: 3, labelKey: 'wed' },
  { value: 4, labelKey: 'thu' },
  { value: 5, labelKey: 'fri' },
  { value: 6, labelKey: 'sat' },
  { value: 7, labelKey: 'sun' },
] as const

const WEEK_OF_MONTH_KEYS = ['recurrenceFirst', 'recurrenceSecond', 'recurrenceThird', 'recurrenceFourth'] as const
const DAY_OF_WEEK_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
const MONTH_KEYS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'] as const

const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400'
const selectClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400'
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'

export function RecurrenceEditor({
  recurrenceType,
  recurrenceConfig,
  recurrenceEndDate,
  dueDate,
  onChange,
}: RecurrenceEditorProps) {
  const { t } = useTranslation('tasks')
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
  const [yearlyMonth, setYearlyMonth] = useState(recurrenceConfig?.month || 1)
  const [yearlyDayOfMonth, setYearlyDayOfMonth] = useState(recurrenceConfig?.day_of_month || 1)
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
    setYearlyMonth(recurrenceConfig?.month || 1)
    setYearlyDayOfMonth(recurrenceConfig?.day_of_month || 1)
    setEndType(recurrenceEndDate ? 'on_date' : 'never')
    setEndDate(recurrenceEndDate ? recurrenceEndDate.slice(0, 10) : '')
  }, [recurrenceType, recurrenceConfig, recurrenceEndDate])

  const getIntervalLabel = (recType: string, iv: number): string => {
    if (recType === 'daily') {
      if (iv === 1) return t('recurrenceEveryDay')
      return t('recurrenceEveryDays', { count: iv })
    }
    if (recType === 'weekly') {
      if (iv === 1) return t('recurrenceEveryWeek')
      return t('recurrenceEveryWeeks', { count: iv })
    }
    if (recType === 'monthly') {
      if (iv === 1) return t('recurrenceEveryMonth')
      return t('recurrenceEveryMonths', { count: iv })
    }
    if (iv === 1) return t('recurrenceEveryYear')
    return t('recurrenceEveryYears', { count: iv })
  }

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
    yearlyMonth: number
    yearlyDayOfMonth: number
    endType: 'never' | 'on_date'
    endDate: string
  }>) => {
    const e = overrides.enabled ?? enabled
    if (!e) {
      onChange({ recurrence_type: null, recurrence_config: null, recurrence_end_date: null })
      return
    }

    const tp = overrides.type ?? type
    const iv = overrides.interval ?? interval
    const sd = overrides.selectedDays ?? selectedDays
    const mm = overrides.monthlyMode ?? monthlyMode
    const dom = overrides.dayOfMonth ?? dayOfMonth
    const wom = overrides.weekOfMonth ?? weekOfMonth
    const dow = overrides.dayOfWeek ?? dayOfWeek
    const ym = overrides.yearlyMonth ?? yearlyMonth
    const ydom = overrides.yearlyDayOfMonth ?? yearlyDayOfMonth
    const et = overrides.endType ?? endType
    const ed = overrides.endDate ?? endDate

    const config: RecurrenceConfig = {
      type: tp as RecurrenceConfig['type'],
      interval: iv,
    }

    if (tp === 'weekly') {
      config.days = sd.length > 0 ? sd : [1]
    } else if (tp === 'monthly') {
      if (mm === 'day') {
        config.day_of_month = dom
      } else {
        config.week_of_month = wom
        config.day_of_week = dow
      }
    } else if (tp === 'yearly') {
      config.month = ym
      config.day_of_month = ydom
    }

    onChange({
      recurrence_type: tp,
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

  const handleYearlyMonthChange = (month: number) => {
    setYearlyMonth(month)
    emitChangeWith({ yearlyMonth: month })
  }

  const handleYearlyDayOfMonthChange = (day: number) => {
    setYearlyDayOfMonth(day)
    emitChangeWith({ yearlyDayOfMonth: day })
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
          {t('recurringTask')}
        </span>
      </label>
      {!dueDate && (
        <p className="text-xs text-amber-600 dark:text-amber-400 pl-6">
          {t('recurrenceNeedDeadline')}
        </p>
      )}

      {enabled && (
        <div className="space-y-3 pl-6 border-l-2 border-indigo-200 dark:border-indigo-800">
          <div>
            <label className={labelClass}>{t('recurrenceType')}</label>
            <select
              value={type}
              onChange={e => handleTypeChange(e.target.value)}
              className={selectClass}
            >
              {RECURRENCE_TYPE_KEYS.map(opt => (
                <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              {t('recurrenceInterval')} — {getIntervalLabel(type, interval)}
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
              <label className={labelClass}>{t('recurrenceDaysOfWeek')}</label>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAY_KEYS.map(day => {
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
                      {t(day.labelKey)}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {type === 'monthly' && (
            <div className="space-y-3">
              <div>
                <label className={labelClass}>{t('recurrenceMethod')}</label>
                <select
                  value={monthlyMode}
                  onChange={e => handleMonthlyModeChange(e.target.value as 'day' | 'weekday')}
                  className={selectClass}
                >
                  <option value="day">{t('recurrenceByDate')}</option>
                  <option value="weekday">{t('recurrenceByDay')}</option>
                </select>
              </div>

              {monthlyMode === 'day' && (
                <div>
                  <label className={labelClass}>{t('recurrenceDayOfMonth')}</label>
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
                    <label className={labelClass}>{t('recurrenceWeek')}</label>
                    <select
                      value={weekOfMonth}
                      onChange={e => handleWeekOfMonthChange(parseInt(e.target.value))}
                      className={selectClass}
                    >
                      {WEEK_OF_MONTH_KEYS.map((key, i) => (
                        <option key={i} value={i + 1}>{t(key)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>{t('recurrenceDayOfWeek')}</label>
                    <select
                      value={dayOfWeek}
                      onChange={e => handleDayOfWeekChange(parseInt(e.target.value))}
                      className={selectClass}
                    >
                      {DAY_OF_WEEK_KEYS.map((key, i) => (
                        <option key={i} value={i + 1}>{t(key)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {type === 'yearly' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>{t('recurrenceMonth')}</label>
                <select
                  value={yearlyMonth}
                  onChange={e => handleYearlyMonthChange(parseInt(e.target.value))}
                  className={selectClass}
                >
                  {MONTH_KEYS.map((key, i) => (
                    <option key={i} value={i + 1}>{t(key)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>{t('recurrenceDayOfMonth')}</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={yearlyDayOfMonth}
                  onChange={e => handleYearlyDayOfMonthChange(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          <div>
            <label className={labelClass}>{t('recurrenceEnd')}</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="recurrence-end"
                  checked={endType === 'never'}
                  onChange={() => handleEndTypeChange('never')}
                  className="w-4 h-4 text-indigo-600 dark:text-indigo-400 border-gray-300 dark:border-gray-600 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('recurrenceNever')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="recurrence-end"
                  checked={endType === 'on_date'}
                  onChange={() => handleEndTypeChange('on_date')}
                  className="w-4 h-4 text-indigo-600 dark:text-indigo-400 border-gray-300 dark:border-gray-600 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('recurrenceDate')}:</span>
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
