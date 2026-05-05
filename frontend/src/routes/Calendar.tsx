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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t('title')}</h1>
      <CalendarHeader />
      {view === 'day' && <DayView />}
      {view === 'week' && <WeekView />}
      {view === 'month' && <MonthView />}
      {view === 'year' && <YearView />}
    </div>
  )
}
