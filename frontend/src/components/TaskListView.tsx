import { useState, useRef, useEffect } from 'react'
import type { Task, UpdateTask, GtdStatus } from '../hooks/useTasks'
import { useSubtasks } from '../hooks/useSubtasks'
import { TaskEditModal } from './TaskEditModal'
import { HighlightText } from './TaskFilterPanel'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const taskCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be at most 255 characters'),
  description: z.string().nullable().optional(),
})

type TaskCreateFormData = z.infer<typeof taskCreateSchema>

const DEFAULT_MOVE_TARGETS: { status: GtdStatus; label: string }[] = [
  { status: 'inbox', label: '→ Inbox' },
  { status: 'next', label: '→ Next' },
  { status: 'waiting', label: '→ Waiting' },
  { status: 'someday', label: '→ Someday' },
  { status: 'trash', label: '→ Trash' },
]

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
  emptyMessage?: string
}

function SubtaskSection({ taskId, onSubtaskChange }: { taskId: string; onSubtaskChange: () => void }) {
  const { subtasks, isLoading, addSubtask, toggleSubtask, deleteSubtask } = useSubtasks(taskId)
  const [expanded, setExpanded] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [isAdding, setIsAdding] = useState(false)

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

function formatDate(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Сегодня'
  if (diffDays === 1) return 'Вчера'
  if (diffDays < 7) return `${diffDays} дн. назад`
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
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
  emptyMessage = 'Нет задач.',
}: TaskListViewProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [showDescription, setShowDescription] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

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
    if (!isLoading) {
      const id = requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
      return () => cancelAnimationFrame(id)
    }
  }, [isLoading])

  const handleAddTask = async (data: TaskCreateFormData) => {
    setIsAdding(true)
    try {
      await onAddTask({ title: data.title, description: data.description || undefined })
      reset()
      setShowDescription(false)
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    } catch {}
    setIsAdding(false)
  }

  const handleSaveTask = async (id: string, data: UpdateTask) => {
    await onSaveTask(id, data)
    setEditingTask(null)
  }

  const effectiveMoveTargets = moveTargets ?? DEFAULT_MOVE_TARGETS

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

      {tasks.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">{emptyMessage}</p>
        </div>
      )}

      {tasks.length > 0 && (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4 hover:shadow-md dark:hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => onToggleTask(task.id)}
                  className="mt-1 h-4 w-4 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                />
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-medium ${task.completed ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                    <HighlightText text={task.title} query={searchQuery} />
                  </h3>
                  {task.description && (
                    <p className={`mt-1 text-sm ${task.completed ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-500 dark:text-gray-400'}`}>
                      <HighlightText text={task.description} query={searchQuery} />
                    </p>
                  )}
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {task.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white ${task.completed ? 'opacity-60' : ''}`}
                          style={{ backgroundColor: tag.color || '#6366f1' }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {formatDate(task.created_at)}
                    </p>
                    {task.subtasks_count > 0 && (
                      <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium">
                        {task.subtasks_completed}/{task.subtasks_count}
                      </span>
                    )}
                  </div>
                  <SubtaskSection taskId={task.id} onSubtaskChange={() => onRefetch()} />
                </div>
                <div className="flex gap-2 items-center">
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

      <TaskEditModal
        task={editingTask}
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        onSave={handleSaveTask}
      />
    </>
  )
}
