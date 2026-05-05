import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useCalendarStore } from '../../stores/calendarStore'
import { useCalendarEvents } from '../../hooks/useCalendarEvents'
import { useCalendarTasks } from '../../hooks/useCalendarTasks'

const MONTH_KEYS = [
  'months.jan', 'months.feb', 'months.mar', 'months.apr',
  'months.may', 'months.jun', 'months.jul', 'months.aug',
  'months.sep', 'months.oct', 'months.nov', 'months.dec',
] as const

const WEEK_DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function getMonthDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1)
  let startDow = firstDay.getDay()
  if (startDow === 0) startDow = 7
  const startOffset = startDow - 1
  const days: Date[] = []
  for (let i = 0; i < 42; i++) {
    days.push(new Date(year, month, 1 - startOffset + i))
  }
  return days
}

export function YearView() {
  const { t } = useTranslation('calendar')
  const { currentDate, setView, setCurrentDate } = useCalendarStore()
  const { events } = useCalendarEvents()
  const { tasks } = useCalendarTasks()
  const year = currentDate.getFullYear()
  const today = new Date()

  const allDates = useMemo(() => {
    const map = new Map<string, boolean>()
    for (const e of events) {
      const d = new Date(e.start_time)
      map.set(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`, true)
    }
    for (const t of tasks) {
      const d = new Date(t.start_time)
      map.set(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`, true)
    }
    return map
  }, [events, tasks])

  const hasItemsOnDay = (d: Date): boolean => {
    return allDates.has(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)
  }

  const handleMonthClick = (month: number) => {
    setCurrentDate(new Date(year, month, 1))
    setView('month')
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 12 }, (_, month) => {
        const days = getMonthDays(year, month)
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month

        return (
          <div
            key={month}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
            onClick={() => handleMonthClick(month)}
          >
            <div className={`text-sm font-semibold mb-2 ${isCurrentMonth ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`}>
              {t(MONTH_KEYS[month])}
            </div>

            <div className="grid grid-cols-7 gap-0">
              {WEEK_DAY_KEYS.map((key) => (
                <div key={key} className="text-center text-[9px] text-gray-400 dark:text-gray-500 pb-0.5">
                  {t(`weekDays.${key}`)[0]}
                </div>
              ))}
              {days.slice(0, 35).map((day, i) => {
                const inMonth = day.getMonth() === month
                const isCurrentDay = isSameDay(day, today)
                const hasItems = inMonth && hasItemsOnDay(day)

                return (
                  <div
                    key={i}
                    className={`text-center text-[11px] leading-tight py-0.5 ${
                      !inMonth
                        ? 'text-gray-300 dark:text-gray-600'
                        : isCurrentDay
                          ? 'font-bold'
                          : hasItems
                            ? 'font-medium text-gray-900 dark:text-gray-200'
                            : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {isCurrentDay ? (
                      <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-indigo-600 text-white font-bold">
                        {day.getDate()}
                      </span>
                    ) : (
                      day.getDate()
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
