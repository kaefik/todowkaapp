import { useTranslation } from 'react-i18next'
import { useCalendarStore } from '../stores/calendarStore'
import { CalendarHeader } from '../components/calendar/CalendarHeader'
import { MonthView } from '../components/calendar/MonthView'
import { DayView } from '../components/calendar/DayView'
import { WeekView } from '../components/calendar/WeekView'
import { YearView } from '../components/calendar/YearView'

export function Calendar() {
  const { t } = useTranslation('calendar')
  const { view } = useCalendarStore()
  return (
    <div>
      <div className="sticky top-16 lg:top-0 z-10 -mx-4 px-4 lg:-mx-8 lg:px-8 -mt-4 pt-4 lg:-mt-8 lg:pt-8 pb-2 bg-gray-50 dark:bg-gray-900">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t('title')}</h1>
        <CalendarHeader />
      </div>
      {view === 'day' && <DayView />}
      {view === 'week' && <WeekView />}
      {view === 'month' && <MonthView />}
      {view === 'year' && <YearView />}
    </div>
  )
}
