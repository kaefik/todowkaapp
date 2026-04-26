import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Task } from '../hooks/useTasks'
import type { Tag } from '../hooks/useTags'
import { useTasks } from '../hooks/useTasks'
import { useContexts } from '../hooks/useContexts'
import { useAreas } from '../hooks/useAreas'
import { useProjects } from '../hooks/useProjects'
import { useAuthStore } from '../stores/authStore'

interface TaskDetailModalProps {
  taskId: string | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (task: Task) => void
}

function formatDueDateWithTime(dateStr: string | null, timezone: string | null, locale: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const hours = d.getHours()
  const minutes = d.getMinutes()
  const seconds = d.getSeconds()
  const ms = d.getMilliseconds()
  const hasTime = !(hours === 23 && minutes === 59 && seconds === 59 && ms >= 999)

  const datePart = d.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: timezone || undefined,
  })

  if (!hasTime) return datePart

  const timePart = d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone || undefined,
  })

  return `${datePart}, ${timePart}`
}

function formatDateTime(dateStr: string, timezone: string | null, locale: string): string {
  return new Date(dateStr).toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: timezone || undefined,
  })
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '-'
  const [hours, minutes] = timeStr.split(':')
  return `${hours}:${minutes}`
}

function formatReminderOffsets(offsets: number[] | null, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (!offsets || offsets.length === 0) return '-'
  return offsets.map(o => {
    if (o < 60) return t('remindersBefore', { count: o })
    if (o < 1440) return t('remindersBeforeHours', { count: Math.floor(o / 60) })
    return t('remindersBeforeDays', { count: Math.floor(o / 1440) })
  }).join(', ')
}

export function TaskDetailModal({ taskId, isOpen, onClose, onEdit }: TaskDetailModalProps) {
  const { t, i18n } = useTranslation('tasks')
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'en-US'
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const { fetchTask } = useTasks()
  const { contexts } = useContexts()
  const { areas } = useAreas()
  const { projects } = useProjects()
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && taskId) {
      setLoading(true)
      setError(null)
      fetchTask(taskId)
        .then((data) => {
          setTask(data)
          setLoading(false)
        })
        .catch((err) => {
          setError(err.message || 'Failed to load task')
          setLoading(false)
        })
    }
  }, [isOpen, taskId, fetchTask])

  const handleEdit = () => {
    if (task && onEdit) {
      onClose()
      onEdit(task)
    } else {
      onClose()
      navigate(`/tasks?editTaskId=${taskId}`)
    }
  }

  if (!isOpen) return null

  const context = task?.context_id ? contexts.find(c => c.id === task.context_id) : null
  const area = task?.area_id ? areas.find(a => a.id === task.area_id) : null
  const project = task?.project_id ? projects.find(p => p.id === task.project_id) : null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 dark:bg-black/90"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 shadow-2xl mx-4 max-w-2xl w-full rounded-lg max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('taskDetail')}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-1">{t('taskNotFound')}</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm">{error}</p>
            </div>
          ) : task ? (
            <div className="space-y-6">
              <div>
                <h3 className={`text-2xl font-semibold mb-2${task.completed ? ' text-gray-400 dark:text-gray-500 line-through decoration-2 decoration-gray-400 dark:decoration-gray-500' : ' text-gray-900 dark:text-gray-100'}`}>{task.title}</h3>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    task.gtd_status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                    task.gtd_status === 'inbox' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                    task.gtd_status === 'next' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                    task.gtd_status === 'waiting' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    task.gtd_status === 'someday' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {task.gtd_status}
                  </span>
                  {task.completed && (
                    <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {t('completedStatus')}
                    </span>
                  )}
                  {task.is_recurring && (
                    <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1" title={t('recurringTask')}>
                      &#x1F504; {t('recurring')}
                    </span>
                  )}
                  {(task.reminder_time || task.reminder_offsets?.length) && !task.reminder_fired && (
                    <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1" title={t('hasReminder')}>
                      &#x1F514; {t('hasReminder')}
                    </span>
                  )}
                </div>
              </div>

              {task.description && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('descriptionLabel')}</h4>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{task.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {context && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('context')}</h4>
                    <div className="flex items-center gap-2">
                      {context.icon && <span>{context.icon}</span>}
                      <span 
                        className="text-sm text-gray-600 dark:text-gray-400"
                        style={{ color: context.color || undefined }}
                      >
                        {context.name}
                      </span>
                    </div>
                  </div>
                )}

                {project && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('project')}</h4>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: project.color || '#6366f1' }}
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{project.name}</span>
                    </div>
                  </div>
                )}

                {area && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('area')}</h4>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: area.color || '#6366f1' }}
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{area.name}</span>
                    </div>
                  </div>
                )}

                {task.due_date && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('deadline')}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{formatDueDateWithTime(task.due_date, user?.timezone ?? null, locale)}</p>
                  </div>
                )}

                {task.reminder_time && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('reminderLabel')}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatTime(task.reminder_time)} {task.reminder_fired && t('alreadyFired')}
                    </p>
                  </div>
                )}

                {task.reminder_offsets && task.reminder_offsets.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('remindersLabel')}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatReminderOffsets(task.reminder_offsets, t)} {task.reminder_fired && t('alreadyFired')}
                    </p>
                  </div>
                )}
              </div>

              {task.tags && task.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('tags')}</h4>
                  <div className="flex flex-wrap gap-2">
                    {task.tags.map((tag: Tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: tag.color || '#6366f1' }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {task.notes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('notes')}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{task.notes}</p>
                </div>
              )}

              {task.subtasks_count > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('subtasksLabel')}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('ofCompletedSub', { completed: task.subtasks_completed, total: task.subtasks_count })}
                  </p>
                  <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-indigo-600 dark:bg-indigo-400 h-2 rounded-full transition-all"
                      style={{ width: `${(task.subtasks_completed / task.subtasks_count) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-400 dark:text-gray-500 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p>{t('createdAt')}: {formatDateTime(task.created_at, user?.timezone ?? null, locale)}</p>
                <p>{t('updatedAt')}: {formatDateTime(task.updated_at, user?.timezone ?? null, locale)}</p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
          >
            {t('close', { ns: 'common' })}
          </button>
          {task && !error && (
            <button
              type="button"
              onClick={handleEdit}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 border border-transparent rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
            >
              {t('editTaskBtn')}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
