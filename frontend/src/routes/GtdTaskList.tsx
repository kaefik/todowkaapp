import { useState, useRef, useEffect } from 'react'
import { useTasks, type Task, type UpdateTask, type GtdStatus } from '../hooks/useTasks'
import { TaskEditModal } from '../components/TaskEditModal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const taskCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be at most 255 characters'),
  description: z.string().nullable().optional(),
})

type TaskCreateFormData = z.infer<typeof taskCreateSchema>

interface GtdTaskListProps {
  gtdStatus: GtdStatus
  title: string
}

export function GtdTaskList({ gtdStatus, title }: GtdTaskListProps) {
  const {
    tasks,
    isLoading,
    error,
    addTask,
    updateTask,
    toggleTask,
    moveTask,
    deleteTask,
    refetch,
  } = useTasks({ gtd_status: gtdStatus })

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
    defaultValues: {
      title: '',
      description: '',
    },
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return 'Сегодня'
    } else if (diffDays === 1) {
      return 'Вчера'
    } else if (diffDays < 7) {
      return `${diffDays} дн. назад`
    } else {
      return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
    }
  }

  const handleAddTask = async (data: TaskCreateFormData) => {
    setIsAdding(true)
    try {
      const taskData: Record<string, unknown> = { title: data.title, gtd_status: gtdStatus }
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
      if (gtdStatus === 'trash') {
        if (!confirm('Are you sure you want to permanently delete this task?')) return
        await deleteTask(id)
      } else {
        await moveTask(id, 'trash')
      }
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

  const handleMoveTask = async (id: string, targetStatus: GtdStatus) => {
    try {
      await moveTask(id, targetStatus)
      refetch()
    } catch {
    }
  }

  const moveTargets: { status: GtdStatus; label: string }[] = [
    { status: 'inbox', label: '→ Inbox' },
    { status: 'next', label: '→ Next' },
    { status: 'waiting', label: '→ Waiting' },
    { status: 'someday', label: '→ Someday' },
    { status: 'trash', label: '→ Trash' },
  ]

  if (isLoading && tasks.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>

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

      {gtdStatus !== 'completed' && gtdStatus !== 'trash' && (
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
          <p className="text-gray-500 dark:text-gray-400 text-lg">No tasks.</p>
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
                  onChange={() => handleToggleTask(task.id)}
                  className="mt-1 h-4 w-4 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                />
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-medium ${task.completed ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className={`mt-1 text-sm ${task.completed ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-500 dark:text-gray-400'}`}>
                      {task.description}
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
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    {formatDate(task.created_at)}
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  {moveTargets
                    .filter((t) => t.status !== gtdStatus)
                    .map((t) => (
                      <button
                        key={t.status}
                        onClick={() => handleMoveTask(task.id, t.status)}
                        className="text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none"
                        title={`Move to ${t.label}`}
                      >
                        {t.label}
                      </button>
                    ))}
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
      )}

      <TaskEditModal
        task={editingTask}
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        onSave={handleSaveTask}
      />
    </div>
  )
}
