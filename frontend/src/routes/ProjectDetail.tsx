import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { httpClient, ApiError } from '../api/httpClient'
import type { Project } from '../hooks/useProjects'
import { useTasks, type UpdateTask, type GtdStatus } from '../hooks/useTasks'
import { useTaskFilter } from '../hooks/useTaskFilter'
import { TaskFilterPanel } from '../components/TaskFilterPanel'
import { TaskListView } from '../components/TaskListView'
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
  const [isLoadingProject, setIsLoadingProject] = useState(true)
  const [projectError, setProjectError] = useState<string | null>(null)

  const fetchProject = useCallback(async () => {
    if (!id) return
    setIsLoadingProject(true)
    setProjectError(null)
    try {
      const response = await httpClient.get<Project>(`/projects/${id}`)
      setProject(response.data)
    } catch (err) {
      if (err instanceof ApiError) {
        setProjectError(err.message)
      } else {
        setProjectError('Не удалось загрузить проект')
      }
    } finally {
      setIsLoadingProject(false)
    }
  }, [id])

  useEffect(() => {
    fetchProject()
  }, [fetchProject])

  const {
    filters,
    searchInput,
    setSearchInput,
    updateFilter,
    clearFilters,
    hasActiveFilters,
  } = useTaskFilter({ project_id: id })

  const activeFilters = useMemo(() => ({ ...filters, project_id: id }), [filters, id])

  const {
    tasks,
    isLoading: isLoadingTasks,
    error: tasksError,
    addTask,
    updateTask,
    toggleTask,
    moveTask,
    refetch,
  } = useTasks(activeFilters)

  const handleAddTask = async (data: { title: string; description?: string }) => {
    await addTask({ ...data, project_id: id })
    fetchProject()
  }

  const handleDeleteTask = async (taskId: string) => {
    await moveTask(taskId, 'trash')
    fetchProject()
    notifyTasksChanged()
  }

  const handleSaveTask = async (taskId: string, data: UpdateTask) => {
    await updateTask(taskId, data)
    refetch()
    fetchProject()
  }

  const handleMoveTask = async (taskId: string, status: GtdStatus) => {
    await moveTask(taskId, status)
    refetch()
    fetchProject()
    notifyTasksChanged()
  }

  const handleToggleTask = async (taskId: string) => {
    await toggleTask(taskId)
    fetchProject()
  }

  if (isLoadingProject) {
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

  if (projectError || !project) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/projects')}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          &larr; Назад к проектам
        </button>
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-800 dark:text-red-400">{projectError || 'Проект не найден'}</p>
        </div>
      </div>
    )
  }

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

      <TaskFilterPanel
        filters={activeFilters}
        searchInput={searchInput}
        onSearchInput={setSearchInput}
        onUpdateFilter={updateFilter}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
        hideProject
      />

      <TaskListView
        tasks={tasks}
        isLoading={isLoadingTasks}
        error={tasksError}
        searchQuery={filters.search}
        onAddTask={handleAddTask}
        showAddForm={true}
        defaultProjectId={id}
        onToggleTask={handleToggleTask}
        onDeleteTask={handleDeleteTask}
        onMoveTask={handleMoveTask}
        onSaveTask={handleSaveTask}
        onRefetch={() => { refetch(); fetchProject() }}
        emptyMessage="В проекте пока нет задач."
      />
    </div>
  )
}
