import { useState } from 'react'
import { useTasks } from '../hooks/useTasks'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { TaskEditModal } from '../components/TaskEditModal'

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

  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [showDescription, setShowDescription] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isCompletedCollapsed, setIsCompletedCollapsed] = useState(false)
  const [editingTask, setEditingTask] = useState<ReturnType<typeof useTasks>['tasks'][number] | null>(null)

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    setIsAdding(true)
    try {
      await addTask({
        title: newTaskTitle,
        description: newTaskDescription || undefined,
      })
      setNewTaskTitle('')
      setNewTaskDescription('')
      setShowDescription(false)
    } catch {
    } finally {
      setIsAdding(false)
    }
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

  const handleEditTask = (task: ReturnType<typeof useTasks>['tasks'][number]) => {
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
          <div key={i} className="bg-white rounded-lg shadow-sm p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={() => refetch()}
              className="ml-auto text-sm font-medium text-red-600 hover:text-red-500"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleAddTask} className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add a new task..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            disabled={isAdding}
          />
          <button
            type="button"
            onClick={() => setShowDescription(!showDescription)}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={isAdding}
          >
            {showDescription ? '−' : '+'}
          </button>
          <button
            type="submit"
            disabled={isAdding || !newTaskTitle.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAdding ? 'Adding...' : 'Add'}
          </button>
        </div>

        {showDescription && (
          <div className="mt-3">
            <textarea
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              placeholder="Add a description (optional)"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={isAdding}
            />
          </div>
        )}
      </form>

      {tasks.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No tasks yet.</p>
          <p className="text-gray-400 text-sm mt-1">Add your first task above!</p>
        </div>
      )}

      {activeTasks.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Active</h2>
          <div className="space-y-2">
            {activeTasks.map((task) => (
              <div
                key={task.id}
                className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => handleToggleTask(task.id)}
                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900">
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="mt-1 text-sm text-gray-500">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditTask(task)}
                      className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-sm text-red-500 hover:text-red-700 focus:outline-none"
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
            className="w-full flex items-center justify-between text-lg font-semibold text-gray-900 mb-3 hover:text-gray-700 focus:outline-none focus:text-gray-700 transition-colors"
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
                  className="bg-white rounded-lg shadow-sm p-4 opacity-75"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => handleToggleTask(task.id)}
                      className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-500 line-through">
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="mt-1 text-sm text-gray-400 line-through">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditTask(task)}
                        className="text-sm text-gray-400 hover:text-gray-600 focus:outline-none"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-sm text-red-400 hover:text-red-600 focus:outline-none"
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

      {editingTask && (
        <TaskEditModal
          task={editingTask}
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          onSave={handleSaveTask}
        />
      )}
    </div>
  )
}

export function Tasks() {
  return (
    <ProtectedRoute>
      <TasksContent />
    </ProtectedRoute>
  )
}
