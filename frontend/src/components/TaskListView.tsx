import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { Task, UpdateTask, GtdStatus } from '../hooks/useTasks'
import { useSubtasks } from '../hooks/useSubtasks'
import { useRecurrences } from '../hooks/useRecurrences'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { TaskEditModal } from './TaskEditModal'
import { TaskDetailModal } from './TaskDetailModal'
import { HighlightText } from './TaskFilterPanel'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const taskCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be at most 255 characters'),
  description: z.string().nullable().optional(),
})

type TaskCreateFormData = z.infer<typeof taskCreateSchema>

const DEFAULT_MOVE_TARGETS: { status: GtdStatus; label: string }[] = []

const GTD_STATUS_CONFIG: Record<GtdStatus, { label: string; bg: string; text: string }> = {
  inbox: { label: 'Inbox', bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300' },
  active: { label: 'Active', bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300' },
  next: { label: 'Next', bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300' },
  waiting: { label: 'Waiting', bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300' },
  someday: { label: 'Someday', bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300' },
  completed: { label: 'Completed', bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-500 dark:text-gray-400' },
  trash: { label: 'Trash', bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-600 dark:text-red-400' },
}

export interface TaskListViewProps {
  tasks: Task[]
  isLoading: boolean
  error: string | null
  searchQuery?: string
  onAddTask: (data: { title: string; description?: string }) => Promise<void>
  showAddForm?: boolean
  defaultGtdStatus?: GtdStatus
  defaultProjectId?: string
  onToggleTask: (id: string) => void
  onDeleteTask: (id: string) => Promise<void>
  onMoveTask: (id: string, status: GtdStatus) => Promise<void>
  onSaveTask: (id: string, data: UpdateTask) => Promise<void>
  onRefetch: () => void
  hideMoveButtons?: boolean
  moveTargets?: { status: GtdStatus; label: string }[]
  onRestoreTask?: (id: string) => void
  emptyMessage?: string
  autoFocus?: boolean
  showGtdStatus?: boolean
}

function SubtaskSection({ taskId, onSubtaskChange }: { taskId: string; onSubtaskChange: () => void }) {
  const storageKey = `ui-subtask-expanded-${taskId}`
  const [expanded, setExpanded] = useLocalStorage(storageKey, false)
  const [newTitle, setNewTitle] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const { subtasks, isLoading, addSubtask, toggleSubtask, deleteSubtask, refetch } = useSubtasks(expanded ? taskId : null)

  useEffect(() => {
    if (expanded) {
      refetch()
    }
  }, [expanded, refetch])

  const handleAdd = async () => {
    const trimmed = newTitle.trim()
    if (!trimmed) return
    setIsAdding(true)
    try {
      await addSubtask(trimmed)
      setNewTitle('')
      onSubtaskChange()
    } catch {}
    setIsAdding(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  const total = subtasks.length
  const completed = subtasks.filter((s) => s.completed).length

  return (
    <div className="mt-2 ml-7">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
      >
        <span className={`transition-transform ${expanded ? 'rotate-90' : ''}`}>▸</span>
        {total > 0 ? `${completed}/${total} подзадач` : '+ Подзадача'}
      </button>

      {expanded && (
        <div className="mt-2 space-y-1 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
          {isLoading && subtasks.length === 0 && (
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2" />
          )}
          {subtasks.map((st) => (
            <div key={st.id} className="flex items-center gap-2 group">
              <input
                type="checkbox"
                checked={st.completed}
                onChange={() => {
                  toggleSubtask(st.id)
                  setTimeout(onSubtaskChange, 300)
                }}
                className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              />
              <span
                className={`text-xs flex-1 ${st.completed ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-700 dark:text-gray-300'}`}
              >
                {st.title}
              </span>
              <button
                onClick={() => {
                  deleteSubtask(st.id)
                  setTimeout(onSubtaskChange, 300)
                }}
                className="text-[10px] text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Новая подзадача..."
              disabled={isAdding}
              className="flex-1 text-xs px-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={isAdding || !newTitle.trim()}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 disabled:opacity-50"
            >
              + Добавить
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function formatDueDate(dueDate: string | null): { text: string; overdue: boolean } {
  if (!dueDate) return { text: 'Без срока', overdue: false }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const due = new Date(dueDate)
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const diffMs = dueDay.getTime() - today.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  const shortDate = formatShortDate(due)

  if (diffDays === 0) return { text: `Сегодня (${shortDate})`, overdue: false }
  if (diffDays === 1) return { text: `Завтра (${shortDate})`, overdue: false }
  if (diffDays === -1) return { text: `Вчера (${shortDate})`, overdue: true }
  if (diffDays < -1) return { text: `Просрочен на ${Math.abs(diffDays)} дн. (${shortDate})`, overdue: true }
  if (diffDays <= 7) return { text: `Через ${diffDays} дн. (${shortDate})`, overdue: false }
  return { text: shortDate, overdue: false }
}


function TaskIcons({ task, onHistoryClick }: { task: Task; onHistoryClick: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 ml-2 flex-shrink-0">
      {task.is_recurring && (
        <button
          type="button"
          onClick={onHistoryClick}
          className="text-sm hover:opacity-70 focus:outline-none"
          title="Повторяющаяся задача — показать историю"
        >
          &#x1F504;
        </button>
      )}
      {(task.reminder_time || (task.reminder_offsets && task.reminder_offsets.length > 0)) && !task.reminder_fired && (
        <span className="text-sm" title="Есть напоминание">&#x1F514;</span>
      )}
    </span>
  )
}

function RecurrenceHistoryPopup({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { recurrences, isLoading, error, fetchRecurrences } = useRecurrences()

  useEffect(() => {
    fetchRecurrences(taskId)
  }, [taskId, fetchRecurrences])

  return (
    <div className="absolute z-50 left-0 top-full mt-1 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">История повторений</span>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs focus:outline-none">
          &#x2715;
        </button>
      </div>
      {isLoading && <p className="text-xs text-gray-400">Загрузка...</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
      {!isLoading && !error && recurrences.length === 0 && (
        <p className="text-xs text-gray-400">Нет повторений</p>
      )}
      {!isLoading && recurrences.length > 0 && (
        <ul className="space-y-1 max-h-40 overflow-y-auto">
          {recurrences.map((r) => (
            <li key={r.id} className="text-xs text-gray-600 dark:text-gray-400 flex justify-between">
              <span>{r.due_date_of_generated_task ? new Date(r.due_date_of_generated_task).toLocaleDateString('ru-RU') : '—'}</span>
              <span className="text-gray-400">{r.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function TaskListView({
  tasks,
  isLoading,
  error,
  searchQuery,
  onAddTask,
  showAddForm = true,
  onToggleTask,
  onDeleteTask,
  onMoveTask,
  onSaveTask,
  onRefetch,
  hideMoveButtons = false,
  moveTargets,
  onRestoreTask,
  emptyMessage = 'Нет задач.',
  autoFocus = false,
  showGtdStatus = false,
}: TaskListViewProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const initialFocusDone = useRef(false)
  const [showDescription, setShowDescription] = useLocalStorage(
    'ui-tasklist-show-description',
    false
  )
  const [isAdding, setIsAdding] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [viewingTaskId, setViewingTaskId] = useState<string | null>(null)
  const [historyTaskId, setHistoryTaskId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskCreateFormData>({
    resolver: zodResolver(taskCreateSchema),
    defaultValues: { title: '', description: '' },
  })

  const titleField = register('title')

  useEffect(() => {
    if (autoFocus && !isLoading && !initialFocusDone.current) {
      initialFocusDone.current = true
      const id = requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
      return () => cancelAnimationFrame(id)
    }
    return undefined
  }, [isLoading, autoFocus])

  const handleAddTask = async (data: TaskCreateFormData) => {
    setIsAdding(true)
    try {
      await onAddTask({ title: data.title, description: data.description || undefined })
      reset()
      setShowDescription(false)
      if (autoFocus) {
        requestAnimationFrame(() => {
          inputRef.current?.focus()
        })
      }
    } catch {}
    setIsAdding(false)
  }

  const handleSaveTask = async (id: string, data: UpdateTask) => {
    await onSaveTask(id, data)
    setEditingTask(null)
  }

  const effectiveMoveTargets = moveTargets ?? DEFAULT_MOVE_TARGETS

  const activeTasks = tasks.filter((t) => !t.completed)
  const completedTasks = tasks.filter((t) => t.completed)
  const [isCompletedCollapsed, setIsCompletedCollapsed] = useState(true)

  if (isLoading && tasks.length === 0) {
    return (
      <>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        ))}
      </>
    )
  }

  return (
    <>
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <div className="flex">
            <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
            <button
              onClick={() => onRefetch()}
              className="ml-auto text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleSubmit(handleAddTask)} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Add a new task..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isAdding || isSubmitting}
                {...titleField}
                ref={(e) => {
                  titleField.ref(e)
                  inputRef.current = e
                }}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title.message}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowDescription(!showDescription)}
              className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isAdding || isSubmitting}
            >
              {showDescription ? '−' : '+'}
            </button>
            <button
              type="submit"
              disabled={isAdding || isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 border border-transparent rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAdding || isSubmitting ? 'Adding...' : 'Add'}
            </button>
          </div>

          {showDescription && (
            <div className="mt-3">
              <textarea
                placeholder="Add a description (optional)"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isAdding || isSubmitting}
                {...register('description')}
              />
            </div>
          )}
        </form>
      )}

      {activeTasks.length === 0 && completedTasks.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">{emptyMessage}</p>
        </div>
      )}

      {activeTasks.length > 0 && (
        <div className="space-y-2">
          {activeTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4 hover:shadow-md dark:hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setViewingTaskId(task.id)}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => onToggleTask(task.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1 h-4 w-4 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium relative text-gray-900 dark:text-gray-100">
                    <span className="inline-flex items-center">
                      <HighlightText text={task.title} query={searchQuery} />
                      <TaskIcons task={task} onHistoryClick={() => setHistoryTaskId(task.id)} />
                    </span>
                    {historyTaskId === task.id && (
                      <RecurrenceHistoryPopup taskId={task.id} onClose={() => setHistoryTaskId(null)} />
                    )}
                  </h3>
                  {task.description && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      <HighlightText text={task.description} query={searchQuery} />
                    </p>
                  )}
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {task.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white"
                          style={{ backgroundColor: tag.color || '#6366f1' }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {task.project && (
                    <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                      <Link
                        to={`/projects/${task.project.id}`}
                        className="inline-flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline"
                      >
                        {task.project.color && (
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: task.project.color }} />
                        )}
                        <span>{task.project.name}</span>
                      </Link>
                    </div>
                  )}
                  {task.context && (
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-600 dark:text-gray-400">
                        {task.context.color && (
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: task.context.color }} />
                        )}
                        <span>{task.context.name}</span>
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {showGtdStatus && task.gtd_status && (() => {
                      const cfg = GTD_STATUS_CONFIG[task.gtd_status]
                      return cfg ? (
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>
                          {cfg.label}
                        </span>
                      ) : null
                    })()}
                    {(() => {
                      const { text, overdue } = formatDueDate(task.due_date)
                      return (
                        <p className={`text-xs ${overdue ? 'text-red-500 dark:text-red-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
                          {text}
                        </p>
                      )
                    })()}
                    {task.subtasks_count > 0 && (
                      <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium">
                        {task.subtasks_completed}/{task.subtasks_count}
                      </span>
                    )}
                  </div>
                  <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                    <SubtaskSection taskId={task.id} onSubtaskChange={() => onRefetch()} />
                  </div>
                </div>
                <div className="flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                  {!hideMoveButtons &&
                    effectiveMoveTargets
                      .filter((t) => t.status !== task.gtd_status)
                      .map((t) => (
                        <button
                          key={t.status}
                          onClick={() => onMoveTask(task.id, t.status)}
                          className="text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none"
                          title={`Move to ${t.label}`}
                        >
                          {t.label}
                        </button>
                      ))}
                  {onRestoreTask && (
                    <button
                      onClick={() => onRestoreTask(task.id)}
                      className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 focus:outline-none font-medium"
                    >
                      Восстановить
                    </button>
                  )}
                  <button
                    onClick={() => setEditingTask(task)}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 focus:outline-none"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {completedTasks.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setIsCompletedCollapsed(!isCompletedCollapsed)}
            className="w-full flex items-center justify-between text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none transition-colors"
          >
            <span>Выполненные ({completedTasks.length})</span>
            <svg
              className={`h-4 w-4 transition-transform duration-200 ${isCompletedCollapsed ? '' : 'rotate-180'}`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {!isCompletedCollapsed && (
            <div className="space-y-2">
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4 opacity-75 cursor-pointer"
                  onClick={() => setViewingTaskId(task.id)}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => onToggleTask(task.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 h-4 w-4 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium relative text-gray-400 dark:text-gray-500 line-through decoration-2 decoration-gray-400 dark:decoration-gray-500">
                        <span className="inline-flex items-center">
                          <HighlightText text={task.title} query={searchQuery} />
                          <TaskIcons task={task} onHistoryClick={() => setHistoryTaskId(task.id)} />
                        </span>
                        {historyTaskId === task.id && (
                          <RecurrenceHistoryPopup taskId={task.id} onClose={() => setHistoryTaskId(null)} />
                        )}
                      </h3>
                      {task.description && (
                        <p className="mt-1 text-sm text-gray-400 dark:text-gray-500 line-through decoration-2 decoration-gray-400 dark:decoration-gray-500">
                          <HighlightText text={task.description} query={searchQuery} />
                        </p>
                      )}
                      {task.tags && task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {task.tags.map((tag) => (
                            <span
                              key={tag.id}
                              className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white opacity-60"
                              style={{ backgroundColor: tag.color || '#6366f1' }}
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                      {task.project && (
                        <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                          <Link
                            to={`/projects/${task.project.id}`}
                            className="inline-flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline"
                          >
                            {task.project.color && (
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: task.project.color }} />
                            )}
                            <span className="opacity-60">{task.project.name}</span>
                          </Link>
                        </div>
                      )}
                      {task.context && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 text-[10px] text-gray-600 dark:text-gray-400">
                            {task.context.color && (
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: task.context.color }} />
                            )}
                            <span className="opacity-60">{task.context.name}</span>
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {showGtdStatus && task.gtd_status && (() => {
                          const cfg = GTD_STATUS_CONFIG[task.gtd_status]
                          return cfg ? (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${cfg.bg} ${cfg.text} opacity-60`}>
                              {cfg.label}
                            </span>
                          ) : null
                        })()}
                        {(() => {
                          const { text, overdue } = formatDueDate(task.due_date)
                          return (
                            <p className={`text-xs ${overdue ? 'text-red-500 dark:text-red-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
                              {text}
                            </p>
                          )
                        })()}
                        {task.subtasks_count > 0 && (
                          <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium">
                            {task.subtasks_completed}/{task.subtasks_count}
                          </span>
                        )}
                      </div>
                      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                        <SubtaskSection taskId={task.id} onSubtaskChange={() => onRefetch()} />
                      </div>
                    </div>
                    <div className="flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                      {!hideMoveButtons &&
                        effectiveMoveTargets
                          .filter((t) => t.status !== task.gtd_status)
                          .map((t) => (
                            <button
                              key={t.status}
                              onClick={() => onMoveTask(task.id, t.status)}
                              className="text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none"
                              title={`Move to ${t.label}`}
                            >
                              {t.label}
                            </button>
                          ))}
                      {onRestoreTask && (
                        <button
                          onClick={() => onRestoreTask(task.id)}
                          className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 focus:outline-none font-medium"
                        >
                          Восстановить
                        </button>
                      )}
                      <button
                        onClick={() => setEditingTask(task)}
                        className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="text-sm text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-300 focus:outline-none"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <TaskEditModal
        task={editingTask}
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        onSave={handleSaveTask}
      />

      <TaskDetailModal
        taskId={viewingTaskId}
        isOpen={!!viewingTaskId}
        onClose={() => setViewingTaskId(null)}
        onEdit={(task) => {
          setViewingTaskId(null)
          setEditingTask(task)
        }}
      />
    </>
  )
}
