import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { CalendarEvent } from '../hooks/useCalendarEvents'

interface EventDetailModalProps {
  event: CalendarEvent | null
  isOpen: boolean
  onClose: () => void
  onEdit: (event: CalendarEvent) => void
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString()
}

export function EventDetailModal({ event, isOpen, onClose, onEdit }: EventDetailModalProps) {
  const { t } = useTranslation('calendar')
  const { t: tTasks } = useTranslation('tasks')

  if (!isOpen || !event) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('eventDetail')}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {event.title}
            </h3>
            {event.color && (
              <div className="flex items-center gap-2 mt-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: event.color }}
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t('eventColor')}
                </span>
              </div>
            )}
          </div>

          {event.description && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('eventDescription')}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('eventStart')}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {event.all_day
                  ? new Date(event.start_time).toLocaleDateString()
                  : formatDateTime(event.start_time)}
              </p>
            </div>

            {event.end_time && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('eventEnd')}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {event.all_day
                    ? new Date(event.end_time).toLocaleDateString()
                    : formatDateTime(event.end_time)}
                </p>
              </div>
            )}
          </div>

          {event.all_day && (
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('allDay')}
              </span>
            </div>
          )}

          {event.location && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('location')}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{event.location}</p>
            </div>
          )}

          <div className="text-xs text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700">
            <p>{tTasks('createdAt')}: {formatDateTime(event.created_at)}</p>
            <p>{tTasks('updatedAt')}: {formatDateTime(event.updated_at)}</p>
          </div>
        </div>

        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
          >
            {t('close', { ns: 'common' })}
          </button>
          <button
            type="button"
            onClick={() => { onClose(); onEdit(event) }}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 border border-transparent rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
          >
            {t('editEvent')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}