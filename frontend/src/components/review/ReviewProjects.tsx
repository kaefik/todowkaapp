import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useTasks, type CreateTask } from '../../hooks/useTasks'
import { useReviewStore } from '../../stores/reviewStore'

export function ReviewProjectsStep() {
  const { t } = useTranslation('review')
  const { addTask } = useTasks()
  const { data, markProjectReviewed, incrementNextActionsAdded, setStep } = useReviewStore()
  const projects = data?.active_projects ?? []

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [taskTitle, setTaskTitle] = useState('')
  const [creatingForId, setCreatingForId] = useState<string | null>(null)
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set())
  const [localHasNextAction, setLocalHasNextAction] = useState<Set<string>>(new Set())

  const handleToggleExpand = useCallback(
    (projectId: string) => {
      setExpandedId((prev) => (prev === projectId ? null : projectId))
      setTaskTitle('')
      if (!reviewedIds.has(projectId)) {
        setReviewedIds((prev) => new Set(prev).add(projectId))
        markProjectReviewed()
      }
    },
    [reviewedIds, markProjectReviewed],
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
    [addTask, taskTitle, incrementNextActionsAdded],
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
          const isCreating = creatingForId === project.id
          const hasAction = hasNextAction(project)

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
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
