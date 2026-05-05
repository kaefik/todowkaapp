import { useTranslation } from 'react-i18next'
import { useCalendarStore, type CalendarViewType } from '../../stores/calendarStore'

const MONTH_KEYS = [
  'months.jan', 'months.feb', 'months.mar', 'months.apr',
  'months.may', 'months.jun', 'months.jul', 'months.aug',
  'months.sep', 'months.oct', 'months.nov', 'months.dec',
] as const

const MONTH_SHORT_KEYS = [
  'monthsShort.jan', 'monthsShort.feb', 'monthsShort.mar', 'monthsShort.apr',
  'monthsShort.may', 'monthsShort.jun', 'monthsShort.jul', 'monthsShort.aug',
  'monthsShort.sep', 'monthsShort.oct', 'monthsShort.nov', 'monthsShort.dec',
] as const

const VIEW_KEYS: Record<CalendarViewType, string> = {
  day: 'viewDay',
  week: 'viewWeek',
  month: 'viewMonth',
  year: 'viewYear',
}

function getStartOfWeek(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return date
}

export function CalendarHeader() {
  const { t } = useTranslation('calendar')
  const { view, currentDate, setView, goToday, goNext, goPrev } = useCalendarStore()

  const monthName = t(MONTH_KEYS[currentDate.getMonth()])
  const year = currentDate.getFullYear()
  const day = currentDate.getDate()

  let periodLabel: string
  if (view === 'day') {
    periodLabel = `${monthName} ${day}, ${year}`
  } else if (view === 'week') {
    const start = getStartOfWeek(currentDate)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    const startMonth = t(MONTH_SHORT_KEYS[start.getMonth()])
    const endMonth = t(MONTH_SHORT_KEYS[end.getMonth()])
    periodLabel = end.getFullYear() !== start.getFullYear()
      ? `${start.getDate()} ${startMonth} ${start.getFullYear()} — ${end.getDate()} ${endMonth} ${end.getFullYear()}`
      : `${start.getDate()} ${startMonth} — ${end.getDate()} ${endMonth} ${year}`
  } else if (view === 'month') {
    periodLabel = `${monthName} ${year}`
  } else {
    periodLabel = `${year}`
  }

  const views: CalendarViewType[] = ['day', 'week', 'month', 'year']

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2">
        <button
          onClick={goPrev}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          aria-label={t('previous')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <span className="text-lg font-semibold text-gray-900 dark:text-gray-100 min-w-[180px] text-center">
          {periodLabel}
        </span>

        <button
          onClick={goNext}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          aria-label={t('next')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={goToday}
          className="px-3 py-1.5 text-sm font-medium rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
        >
          {t('today')}
        </button>
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        {views.map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              view === v
                ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-gray-100'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {t(VIEW_KEYS[v])}
          </button>
        ))}
      </div>
    </div>
  )
}
