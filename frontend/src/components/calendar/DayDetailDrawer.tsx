import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useCalendarStore } from '../../stores/calendarStore'
import type { CalendarTaskItem } from '../../hooks/useCalendarTasks'
import type { CalendarEvent } from '../../hooks/useCalendarEvents'
import { CalendarTaskCard } from './CalendarTaskCard'
import { CalendarEventCard } from './CalendarEventCard'
import { TaskDetailModal } from '../TaskDetailModal'
import type { Task } from '../../hooks/useTasks'

interface DayDetailDrawerProps {
  getItemsForDay: (day: Date) => { events: CalendarEvent[]; tasks: CalendarTaskItem[] }
}

export function DayDetailDrawer({ getItemsForDay }: DayDetailDrawerProps) {
  const navigate = useNavigate()
  const { t } = useTranslation('calendar')
  const { selectedDate, detailDrawerOpen, closeDetailDrawer, selectedTaskId, openTaskDetail, closeTaskDetail } = useCalendarStore()

  if (!detailDrawerOpen || !selectedDate) return null

  const { events, tasks } = getItemsForDay(selectedDate)
  const dateLabel = selectedDate.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const handleTaskEdit = (task: Task) => {
    closeTaskDetail()
    navigate(`/tasks?editTaskId=${task.id}`)
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={closeDetailDrawer}
      />

      <div className="fixed right-0 top-0 bottom-0 w-80 lg:w-96 bg-white dark:bg-gray-800 shadow-xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 capitalize">
            {dateLabel}
          </h3>
          <button
            onClick={closeDetailDrawer}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              {t('tasks')}
            </h4>
            {tasks.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">-</p>
            ) : (
              <div className="space-y-1">
                {tasks.map((task) => (
                  <CalendarTaskCard key={task.id} task={task} onClick={() => openTaskDetail(task.id)} />
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              {t('events')}
            </h4>
            {events.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">{t('noEvents')}</p>
            ) : (
              <div className="space-y-1">
                {events.map((event) => (
                  <CalendarEventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <TaskDetailModal
        taskId={selectedTaskId}
        isOpen={!!selectedTaskId}
        onClose={closeTaskDetail}
        onEdit={handleTaskEdit}
      />
    </>
  )
}
