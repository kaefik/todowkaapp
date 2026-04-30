import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useTasks, type CreateTask, type UpdateTask } from '../../hooks/useTasks'
import { useReviewStore } from '../../stores/reviewStore'

type AddMode = 'none' | 'create' | 'select'

interface ExpandedState {
  nextActions: boolean
  addMode: AddMode
  selectedTaskId: string | null
  selectedStatus: 'active' | 'next'
}

export function ReviewProjectsStep() {
  const { t } = useTranslation('review')
  const { addTask, updateTask } = useTasks()
  const { data, markProjectReviewed, incrementNextActionsAdded, setStep } = useReviewStore()
  const projects = data?.active_projects ?? []

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedState, setExpandedState] = useState<Record<string, ExpandedState>>({})
  const [taskTitle, setTaskTitle] = useState('')
  const [creatingForId, setCreatingForId] = useState<string | null>(null)
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set())
  const [localHasNextAction, setLocalHasNextAction] = useState<Set<string>>(new Set())

  const getExpandedState = useCallback(
    (projectId: string): ExpandedState => {
      return expandedState[projectId] || { nextActions: false, addMode: 'none', selectedTaskId: null, selectedStatus: 'active' }
    },
    [expandedState],
  )

  const handleToggleExpand = useCallback(
    (projectId: string) => {
      setExpandedId((prev) => (prev === projectId ? null : projectId))
      setTaskTitle('')
      setExpandedState((prev) => {
        const current = prev[projectId] || { nextActions: false, addMode: 'none', selectedTaskId: null, selectedStatus: 'active' }
        return {
          ...prev,
          [projectId]: { ...current, addMode: 'none', selectedTaskId: null },
        }
      })
      if (!reviewedIds.has(projectId)) {
        setReviewedIds((prev) => new Set(prev).add(projectId))
        markProjectReviewed()
      }
    },
    [reviewedIds, markProjectReviewed],
  )

  const handleToggleNextActions = useCallback(
    (projectId: string) => {
      setExpandedState((prev) => {
        const current = prev[projectId] || { nextActions: false, addMode: 'none', selectedTaskId: null, selectedStatus: 'active' }
        return {
          ...prev,
          [projectId]: { ...current, nextActions: !current.nextActions },
        }
      })
    },
    [],
  )

  const handleSetAddMode = useCallback(
    (projectId: string, mode: AddMode) => {
      setExpandedState((prev) => {
        const current = prev[projectId] || { nextActions: false, addMode: 'none', selectedTaskId: null, selectedStatus: 'active' }
        return {
          ...prev,
          [projectId]: { ...current, addMode: mode, selectedTaskId: null },
        }
      })
    },
    [],
  )

  const handleSelectTask = useCallback(
    (projectId: string, taskId: string) => {
      setExpandedState((prev) => {
        const current = prev[projectId] || { nextActions: false, addMode: 'none', selectedTaskId: null, selectedStatus: 'active' }
        return {
          ...prev,
          [projectId]: { ...current, selectedTaskId: taskId },
        }
      })
    },
    [],
  )

  const handleSetStatus = useCallback(
    (projectId: string, status: 'active' | 'next') => {
      setExpandedState((prev) => {
        const current = prev[projectId] || { nextActions: false, addMode: 'none', selectedTaskId: null, selectedStatus: 'active' }
        return {
          ...prev,
          [projectId]: { ...current, selectedStatus: status },
        }
      })
    },
    [],
  )

  const handleCreate = useCallback(
    async (projectId: string) => {
      const title = taskTitle.trim()
      if (!title) return

      setCreatingForId(projectId)
      try {
        const taskData: CreateTask = {
          title,
          project_id: projectId,
          gtd_status: 'active',
        }
        await addTask(taskData)
        setLocalHasNextAction((prev) => new Set(prev).add(projectId))
        incrementNextActionsAdded()
        setExpandedId(null)
        setTaskTitle('')
      } finally {
        setCreatingForId(null)
      }
    },
    [addTask, incrementNextActionsAdded],
  )

  const handleSelectExisting = useCallback(
    async (projectId: string) => {
      setExpandedState((prev) => {
        const state = prev[projectId] || { nextActions: false, addMode: 'none', selectedTaskId: null, selectedStatus: 'active' }
        if (!state.selectedTaskId) return prev

        setCreatingForId(projectId)
        const selectedTaskId = state.selectedTaskId
        const selectedStatus = state.selectedStatus

        ;(async () => {
          try {
            const updateData: UpdateTask = {
              project_id: projectId,
              gtd_status: selectedStatus,
            }
            await updateTask(selectedTaskId, updateData)
            setLocalHasNextAction((prev) => new Set(prev).add(projectId))
            incrementNextActionsAdded()
            setExpandedId(null)
            setTaskTitle('')
          } finally {
            setCreatingForId(null)
          }
        })()

        return {
          ...prev,
          [projectId]: { ...state, addMode: 'none', selectedTaskId: null },
        }
      })
    },
    [updateTask, incrementNextActionsAdded],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, projectId: string) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleCreate(projectId)
      }
      if (e.key === 'Escape') {
        setExpandedId(null)
        setTaskTitle('')
      }
    },
    [handleCreate],
  )

  const handleSomeday = useCallback(() => {
    projects.forEach((p) => {
      if (!reviewedIds.has(p.id)) {
        markProjectReviewed()
      }
    })
    setStep('someday')
  }, [projects, reviewedIds, markProjectReviewed, setStep])

  const hasNextAction = (project: (typeof projects)[number]) =>
    project.has_next_action || localHasNextAction.has(project.id)

  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return null
    try {
      const date = new Date(dueDate)
      return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
    } catch {
      return null
    }
  }

  if (projects.length === 0) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="px-5 py-4 border-b bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                📁 {t('projectsTitle')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('projectsDescription', { count: 0 })}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSomeday}
              className="px-4 py-2 text-sm font-medium rounded-lg text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
            >
              {t('someday')} →
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-5">
          <p className="text-sm text-gray-400 dark:text-gray-500">{t('projectsEmpty')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-5 py-4 border-b bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              📁 {t('projectsTitle')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('projectsDescription', { count: projects.length })}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSomeday}
            className="px-4 py-2 text-sm font-medium rounded-lg text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
          >
            {t('someday')} →
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {projects.map((project) => {
          const isExpanded = expandedId === project.id
          const state = getExpandedState(project.id)
          const isCreating = creatingForId === project.id
          const hasAction = hasNextAction(project)
          const hasAvailableTasks = project.available_tasks && project.available_tasks.length > 0

          return (
            <div
              key={project.id}
              className={`rounded-lg border overflow-hidden ${
                hasAction
                  ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                  : 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/10'
              }`}
            >
              <div className="flex items-center justify-between gap-3 p-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${
                      hasAction ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate block">
                      {project.name}
                    </span>
                    {project.description && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate block">
                        {project.description}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!hasAction && (
                    <span className="text-xs font-medium text-red-600 dark:text-red-400 whitespace-nowrap">
                      {t('noNextAction')}
                    </span>
                  )}
                  {hasAction && (
                    <span className="text-xs font-medium text-green-600 dark:text-green-400 whitespace-nowrap">
                      ✓
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleToggleExpand(project.id)}
                    className="px-2.5 py-1 text-xs font-medium rounded-md
                      text-indigo-600 dark:text-indigo-400
                      bg-indigo-50 dark:bg-indigo-900/30
                      hover:bg-indigo-100 dark:hover:bg-indigo-900/50
                      transition-colors"
                  >
                    {t('addNextAction')}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-gray-700">
                  {(project.next_actions && project.next_actions.length > 0) && (
                    <div className="mb-3">
                      <button
                        type="button"
                        onClick={() => handleToggleNextActions(project.id)}
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1 mb-2"
                      >
                        <span>{state.nextActions ? '▼' : '▶'}</span>
                        <span>{t('currentNextActions') || 'Текущие задачи'} ({project.next_actions.length})</span>
                      </button>
                      {state.nextActions && (
                        <div className="ml-4 space-y-1">
                          {project.next_actions.map((task) => (
                            <div key={task.id} className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                disabled
                                className="rounded border-gray-300 dark:border-gray-600"
                              />
                              <span className="text-gray-700 dark:text-gray-300">{task.title}</span>
                              {task.due_date && (
                                <span className="text-gray-400 dark:text-gray-500">
                                  {formatDueDate(task.due_date)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {state.addMode === 'none' && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSetAddMode(project.id, 'create')}
                        className="px-3 py-1.5 text-xs font-medium rounded-md text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                      >
                        + {t('createNew') || 'Создать новую'}
                      </button>
                      {hasAvailableTasks && (
                        <button
                          type="button"
                          onClick={() => handleSetAddMode(project.id, 'select')}
                          className="px-3 py-1.5 text-xs font-medium rounded-md text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          {t('selectExisting') || 'Выбрать из существующих'}
                        </button>
                      )}
                    </div>
                  )}

                  {state.addMode === 'create' && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, project.id)}
                        placeholder={t('nextActionPlaceholder')}
                        className="flex-1 px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600
                          bg-white dark:bg-gray-700
                          text-gray-900 dark:text-gray-100
                          placeholder-gray-400 dark:placeholder-gray-500
                          focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                        autoFocus
                        disabled={isCreating}
                      />
                      <button
                        type="button"
                        onClick={() => handleCreate(project.id)}
                        disabled={!taskTitle.trim() || isCreating}
                        className="px-3 py-1.5 text-xs font-medium rounded-md text-white
                          bg-indigo-600 hover:bg-indigo-700
                          dark:bg-indigo-500 dark:hover:bg-indigo-600
                          transition-colors
                          disabled:opacity-50 disabled:cursor-not-allowed
                          flex items-center gap-1"
                      >
                        {isCreating && (
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        )}
                        {t('create')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetAddMode(project.id, 'none')}
                        className="px-2 py-1.5 text-xs font-medium rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {state.addMode === 'select' && hasAvailableTasks && (
                    <div className="space-y-2">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        {t('selectTask') || 'Выберите задачу:'}
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {project.available_tasks.map((task) => (
                          <label
                            key={task.id}
                            className={`flex items-center gap-2 p-2 rounded cursor-pointer text-xs ${
                              state.selectedTaskId === task.id
                                ? 'bg-indigo-50 dark:bg-indigo-900/30'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`task-${project.id}`}
                              checked={state.selectedTaskId === task.id}
                              onChange={() => handleSelectTask(project.id, task.id)}
                              className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 dark:text-indigo-400"
                            />
                            <span className="text-gray-700 dark:text-gray-300 flex-1 truncate">{task.title}</span>
                            {task.due_date && (
                              <span className="text-gray-400 dark:text-gray-500 text-xs">
                                {formatDueDate(task.due_date)}
                              </span>
                            )}
                          </label>
                        ))}
                      </div>

                      {state.selectedTaskId && (
                        <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {t('setStatus') || 'Статус:'}
                          </span>
                          <label className="flex items-center gap-1 text-xs cursor-pointer">
                            <input
                              type="radio"
                              name={`status-${project.id}`}
                              checked={state.selectedStatus === 'active'}
                              onChange={() => handleSetStatus(project.id, 'active')}
                              className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 dark:text-indigo-400"
                            />
                            <span className="text-gray-700 dark:text-gray-300">active</span>
                          </label>
                          <label className="flex items-center gap-1 text-xs cursor-pointer">
                            <input
                              type="radio"
                              name={`status-${project.id}`}
                              checked={state.selectedStatus === 'next'}
                              onChange={() => handleSetStatus(project.id, 'next')}
                              className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 dark:text-indigo-400"
                            />
                            <span className="text-gray-700 dark:text-gray-300">next</span>
                          </label>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => handleSelectExisting(project.id)}
                          disabled={!state.selectedTaskId || isCreating}
                          className="px-3 py-1.5 text-xs font-medium rounded-md text-white
                            bg-indigo-600 hover:bg-indigo-700
                            dark:bg-indigo-500 dark:hover:bg-indigo-600
                            transition-colors
                            disabled:opacity-50 disabled:cursor-not-allowed
                            flex items-center gap-1"
                        >
                          {isCreating && (
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          )}
                          {t('add') || 'Добавить'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetAddMode(project.id, 'none')}
                          className="px-2 py-1.5 text-xs font-medium rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}