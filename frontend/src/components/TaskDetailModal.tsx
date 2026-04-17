import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
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

function formatDate(dateStr: string | null, timezone: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: timezone || undefined,
  })
}

function formatDateTime(dateStr: string, timezone: string | null): string {
  return new Date(dateStr).toLocaleString('ru-RU', {
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

function formatReminderOffsets(offsets: number[] | null): string {
  if (!offsets || offsets.length === 0) return '-'
  return offsets.map(o => {
    if (o < 60) return `за ${o} мин`
    if (o < 1440) return `за ${Math.floor(o / 60)} ч`
    return `за ${Math.floor(o / 1440)} д`
  }).join(', ')
}

export function TaskDetailModal({ taskId, isOpen, onClose, onEdit }: TaskDetailModalProps) {
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
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Детали задачи</h2>
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
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
              {error}
            </div>
          ) : task ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{task.title}</h3>
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
                      Выполнено
                    </span>
                  )}
                  {task.is_recurring && (
                    <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1" title="Повторяющаяся задача">
                      &#x1F504; Повторяется
                    </span>
                  )}
                  {(task.reminder_time || task.reminder_offsets?.length) && !task.reminder_fired && (
                    <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1" title="Есть напоминание">
                      &#x1F514; Напоминание
                    </span>
                  )}
                </div>
              </div>

              {task.description && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Описание</h4>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{task.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {context && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Контекст</h4>
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
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Проект</h4>
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
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Область</h4>
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
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Дедлайн</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(task.due_date, user?.timezone)}</p>
                  </div>
                )}

                {task.reminder_time && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Напоминание</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatTime(task.reminder_time)} {task.reminder_fired && '(уже сработало)'}
                    </p>
                  </div>
                )}

                {task.reminder_offsets && task.reminder_offsets.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Напоминания</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatReminderOffsets(task.reminder_offsets)} {task.reminder_fired && '(уже сработало)'}
                    </p>
                  </div>
                )}
              </div>

              {task.tags && task.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Теги</h4>
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
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Заметки</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{task.notes}</p>
                </div>
              )}

              {task.subtasks_count > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Подзадачи</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {task.subtasks_completed} из {task.subtasks_count} выполнено
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
                <p>Создано: {formatDateTime(task.created_at, user?.timezone)}</p>
                <p>Обновлено: {formatDateTime(task.updated_at, user?.timezone)}</p>
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
            Закрыть
          </button>
          {task && (
            <button
              type="button"
              onClick={handleEdit}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 border border-transparent rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
            >
              Редактировать
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
