import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTasks, type Task, type UpdateTask } from '../hooks/useTasks'
import { useRecurrences } from '../hooks/useRecurrences'
import { TaskEditModal } from '../components/TaskEditModal'
import { TaskDetailModal } from '../components/TaskDetailModal'
import { TaskFilterPanel, HighlightText } from '../components/TaskFilterPanel'
import { useTaskFilter } from '../hooks/useTaskFilter'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const taskCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be at most 255 characters'),
  description: z.string().nullable().optional(),
})

type TaskCreateFormData = z.infer<typeof taskCreateSchema>

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

function TasksContent() {
  const {
    filters,
    searchInput,
    setSearchInput,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    activeFilterCount,
  } = useTaskFilter()

  const {
    tasks,
    isLoading,
    error,
    addTask,
    updateTask,
    toggleTask,
    moveTask,
    refetch,
  } = useTasks(filters)

  const inputRef = useRef<HTMLInputElement>(null)
  const initialFocusDone = useRef(false)
  const [showDescription, setShowDescription] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isCompletedCollapsed, setIsCompletedCollapsed] = useLocalStorage(
    'ui-tasks-completed-collapsed',
    false
  )
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [viewingTaskId, setViewingTaskId] = useState<string | null>(null)
  const [historyTaskId, setHistoryTaskId] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskCreateFormData>({
    resolver: zodResolver(taskCreateSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  })

  const titleField = register('title')

  useEffect(() => {
    if (!isLoading && !initialFocusDone.current) {
      initialFocusDone.current = true
      const id = requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
      return () => cancelAnimationFrame(id)
    }
    return undefined
  }, [isLoading])

  useEffect(() => {
    const editTaskId = searchParams.get('editTaskId')
    if (editTaskId && !isLoading && tasks.length > 0 && !editingTask) {
      const task = tasks.find((t) => t.id === editTaskId)
      if (task) {
        setEditingTask(task)
        setSearchParams({}, { replace: true })
      }
    }
  }, [searchParams, isLoading, tasks, editingTask, setSearchParams])

  const formatDueDate = (dueDate: string | null): { text: string; overdue: boolean } => {
    if (!dueDate) return { text: 'Без срока', overdue: false }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const due = new Date(dueDate)
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
    const diffMs = dueDay.getTime() - today.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
    const shortDate = due.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })

    if (diffDays === 0) return { text: `Сегодня (${shortDate})`, overdue: false }
    if (diffDays === 1) return { text: `Завтра (${shortDate})`, overdue: false }
    if (diffDays === -1) return { text: `Вчера (${shortDate})`, overdue: true }
    if (diffDays < -1) return { text: `Просрочен на ${Math.abs(diffDays)} дн. (${shortDate})`, overdue: true }
    if (diffDays <= 7) return { text: `Через ${diffDays} дн. (${shortDate})`, overdue: false }
    return { text: shortDate, overdue: false }
  }

  const handleAddTask = async (data: TaskCreateFormData) => {
    setIsAdding(true)
    try {
      const taskData: { title: string; description?: string } = { title: data.title }
      if (data.description && data.description.trim()) {
        taskData.description = data.description
      }
      await addTask(taskData)
      reset()
      setShowDescription(false)
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    } catch {
    }
    setIsAdding(false)
  }

  const handleToggleTask = (id: string) => {
    toggleTask(id)
  }

  const handleDeleteTask = async (id: string) => {
    try {
      await moveTask(id, 'trash')
    } catch {
    }
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
  }

  const handleSaveTask = async (id: string, data: UpdateTask) => {
    try {
      await updateTask(id, data)
      refetch()
    } catch (err) {
      console.error('Failed to save task:', err)
    }
  }

  const activeTasks = tasks.filter((task) => !task.completed)
  const completedTasks = tasks.filter((task) => task.completed)

  if (isLoading && tasks.length === 0) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <TaskFilterPanel
        filters={filters}
        searchInput={searchInput}
        onSearchInput={setSearchInput}
        onUpdateFilter={updateFilter}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
        activeFilterCount={activeFilterCount}
      />

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <div className="flex">
            <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
            <button
              onClick={() => refetch()}
              className="ml-auto text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300"
            >
              Retry
            </button>
          </div>
        </div>
      )}

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
            {errors.description && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description.message}</p>
            )}
          </div>
        )}
      </form>

      {tasks.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">No tasks yet.</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Add your first task above!</p>
        </div>
      )}

      {activeTasks.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Active</h2>
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
                    onChange={() => handleToggleTask(task.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 h-4 w-4 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
                      <HighlightText text={task.title} query={filters.search} />
                      <TaskIcons task={task} onHistoryClick={() => setHistoryTaskId(task.id)} />
                      {historyTaskId === task.id && (
                        <span className="relative">
                          <RecurrenceHistoryPopup taskId={task.id} onClose={() => setHistoryTaskId(null)} />
                        </span>
                      )}
                    </h3>
                    {task.description && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <HighlightText text={task.description} query={filters.search} />
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
                    {(() => {
                      const { text, overdue } = formatDueDate(task.due_date)
                      return (
                        <p className={`mt-1 text-xs ${overdue ? 'text-red-500 dark:text-red-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
                          {text}
                        </p>
                      )
                    })()}
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleEditTask(task)}
                      className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 focus:outline-none"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {completedTasks.length > 0 && (
        <div>
          <button
            onClick={() => setIsCompletedCollapsed(!isCompletedCollapsed)}
            className="w-full flex items-center justify-between text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none focus:text-gray-700 dark:focus:text-gray-300 transition-colors"
          >
            <span>Completed</span>
            <svg
              className={`h-5 w-5 transition-transform duration-200 ${
                isCompletedCollapsed ? 'rotate-180' : ''
              }`}
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
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
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
                      onChange={() => handleToggleTask(task.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 h-4 w-4 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 line-through flex items-center">
                        <HighlightText text={task.title} query={filters.search} />
                        <TaskIcons task={task} onHistoryClick={() => setHistoryTaskId(task.id)} />
                        {historyTaskId === task.id && (
                          <span className="relative">
                            <RecurrenceHistoryPopup taskId={task.id} onClose={() => setHistoryTaskId(null)} />
                          </span>
                        )}
                      </h3>
                      {task.description && (
                        <p className="mt-1 text-sm text-gray-400 dark:text-gray-500 line-through">
                          <HighlightText text={task.description} query={filters.search} />
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
                      {(() => {
                        const { text, overdue } = formatDueDate(task.due_date)
                        return (
                          <p className={`mt-1 text-xs ${overdue ? 'text-red-500 dark:text-red-400 font-medium' : 'text-gray-400 dark:text-gray-500'} line-through`}>
                            {text}
                          </p>
                        )
                      })()}
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleEditTask(task)}
                        className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
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
    </div>
  )
}

export function Tasks() {
  return <TasksContent />
}
