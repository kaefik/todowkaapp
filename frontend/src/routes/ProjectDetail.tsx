import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { httpClient, ApiError } from '../api/httpClient'
import type { Project } from '../hooks/useProjects'
import type { Task } from '../hooks/useTasks'
import { notifyTasksChanged } from '../hooks/useGtdCounts'

function ProgressBar({ percent, color }: { percent: number; color: string | null }) {
  const bgColor = color || '#6366f1'
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
      <div
        className="h-3 rounded-full transition-all duration-300"
        style={{ width: `${percent}%`, backgroundColor: bgColor }}
      />
    </div>
  )
}

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProject = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    setError(null)
    try {
      const response = await httpClient.get<Project>(`/projects/${id}`)
      setProject(response.data)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Не удалось загрузить проект')
      }
    } finally {
      setIsLoading(false)
    }
  }, [id])

  const fetchTasks = useCallback(async () => {
    if (!id) return
    try {
      const response = await httpClient.get<{ items: Task[]; total: number }>(`/projects/${id}/tasks`)
      setTasks(response.data.items)
    } catch {
    }
  }, [id])

  useEffect(() => {
    fetchProject()
    fetchTasks()
  }, [fetchProject, fetchTasks])

  const handleToggleTask = async (taskId: string) => {
    try {
      const response = await httpClient.patch<Task>(`/tasks/${taskId}/toggle`)
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: response.data.is_completed } : t)))
      fetchProject()
    } catch {
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await httpClient.patch(`/tasks/${taskId}/move`, { gtd_status: 'trash' })
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      fetchProject()
      notifyTasksChanged()
    } catch {
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/projects')}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          &larr; Назад к проектам
        </button>
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-800 dark:text-red-400">{error || 'Проект не найден'}</p>
        </div>
      </div>
    )
  }

  const activeTasks = tasks.filter((t) => !t.completed)
  const completedTasks = tasks.filter((t) => t.completed)

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/projects')}
        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        &larr; Назад к проектам
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
        <div className="flex items-center gap-3 mb-3">
          {project.color ? (
            <span
              className="w-5 h-5 rounded-full flex-shrink-0"
              style={{ backgroundColor: project.color }}
            />
          ) : (
            <span className="w-5 h-5 rounded-full flex-shrink-0 bg-gray-300 dark:bg-gray-600" />
          )}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{project.name}</h1>
          {!project.is_active && (
            <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              Архив
            </span>
          )}
        </div>

        {project.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{project.description}</p>
        )}

        <div className="space-y-2">
          <ProgressBar percent={project.progress.progress_percent} color={project.color} />
          <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>{project.progress.tasks_completed} / {project.progress.tasks_total} задач</span>
            <span>{project.progress.progress_percent}%</span>
          </div>
        </div>
      </div>

      {activeTasks.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Активные</h2>
          <div className="space-y-2">
            {activeTasks.map((task) => (
              <div
                key={task.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4 hover:shadow-md dark:hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => handleToggleTask(task.id)}
                    className="h-4 w-4 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{task.title}</span>
                    {task.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{task.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 focus:outline-none"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {completedTasks.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Выполненные</h2>
          <div className="space-y-2">
            {completedTasks.map((task) => (
              <div
                key={task.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4 opacity-75"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => handleToggleTask(task.id)}
                    className="h-4 w-4 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 line-through">{task.title}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-sm text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-300 focus:outline-none"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tasks.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">В проекте пока нет задач.</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            Добавьте задачу и назначьте этот проект
          </p>
        </div>
      )}
    </div>
  )
}
