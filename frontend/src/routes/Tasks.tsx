import { useState, useRef, useEffect } from 'react'
import { useTasks, type Task } from '../hooks/useTasks'
import { TaskEditModal } from '../components/TaskEditModal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const taskCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be at most 255 characters'),
  description: z.string().nullable().optional(),
})

type TaskCreateFormData = z.infer<typeof taskCreateSchema>

function TasksContent() {
  const {
    tasks,
    isLoading,
    error,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    refetch,
  } = useTasks()

  const inputRef = useRef<HTMLInputElement>(null)
  const [showDescription, setShowDescription] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isCompletedCollapsed, setIsCompletedCollapsed] = useState(false)
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
      const taskData: Record<string, unknown> = { title: data.title }
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
    if (!confirm('Are you sure you want to delete this task?')) return
    try {
      await deleteTask(id)
    } catch {
    }
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
  }

  const handleSaveTask = async (id: string, data: { title?: string; description?: string | null }) => {
    try {
      await updateTask(id, data)
      refetch()
    } catch {
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
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {task.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      {formatDate(task.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-2">
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
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4 opacity-75"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => handleToggleTask(task.id)}
                      className="mt-1 h-4 w-4 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 line-through">
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="mt-1 text-sm text-gray-400 dark:text-gray-500 line-through">
                          {task.description}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 line-through">
                        {formatDate(task.created_at)}
                      </p>
                    </div>
                    <div className="flex gap-2">
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
    </div>
  )
}

export function Tasks() {
  return <TasksContent />
}
