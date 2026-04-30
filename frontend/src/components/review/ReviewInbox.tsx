import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjects } from '../../hooks/useProjects'
import { db } from '../../db/database'
import { useAuthStore } from '../../stores/authStore'
import type { TaskReviewItem } from '../../api/review'
import type { GtdStatus } from '../../hooks/useTasks'
import { v4 as uuidv4 } from 'uuid'

interface ReviewInboxProps {
  inboxTasks: TaskReviewItem[]
  onComplete: () => void
  onProgress: (processed: number, total: number) => void
}

interface ProcessedTask {
  id: string
  status: GtdStatus
  projectId?: string | null
}

export function ReviewInbox({ inboxTasks, onComplete, onProgress }: ReviewInboxProps) {
  const { t } = useTranslation('review')
  const { projects } = useProjects()
  const user = useAuthStore(s => s.user)

  const [processedMap, setProcessedMap] = useState<Map<string, ProcessedTask>>(new Map())
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const [openProjectId, setOpenProjectId] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  const totalCount = inboxTasks.length
  const processedCount = processedMap.size
  const allProcessed = processedCount >= totalCount && totalCount > 0

  useEffect(() => {
    onProgress(processedCount, totalCount)
  }, [processedCount, totalCount, onProgress])

  useEffect(() => {
    if (allProcessed) {
      const timer = setTimeout(onComplete, 600)
      return () => clearTimeout(timer)
    }
  }, [allProcessed, onComplete])

  const processTask = useCallback(
    async (taskId: string, gtdStatus: GtdStatus, projectId?: string | null) => {
      if (!user) return
      setProcessing(true)
      setRemovingIds(prev => new Set(prev).add(taskId))

      await new Promise(r => setTimeout(r, 300))

      const now = new Date().toISOString()
      const updates: Record<string, unknown> = {
        gtdStatus,
        updatedAt: now,
        _syncStatus: 'modified',
      }
      if (projectId !== undefined) {
        updates.projectId = projectId
      }

      await db.tasks.update(taskId, updates)
      await db.mutations.add({
        id: uuidv4(),
        entityType: 'task',
        entityId: taskId,
        action: 'move',
        payload: JSON.stringify({
          gtd_status: gtdStatus,
          ...(projectId !== undefined ? { project_id: projectId } : {}),
        }),
        timestamp: Date.now(),
        retryCount: 0,
        lastError: null,
      })

      setProcessedMap(prev => {
        const next = new Map(prev)
        next.set(taskId, { id: taskId, status: gtdStatus, projectId })
        return next
      })
      setRemovingIds(prev => {
        const next = new Set(prev)
        next.delete(taskId)
        return next
      })
      setProcessing(false)
    },
    [user],
  )

  const handleDoIt = useCallback(
    (taskId: string) => {
      processTask(taskId, 'active')
    },
    [processTask],
  )

  const handleSomeday = useCallback(
    (taskId: string) => {
      processTask(taskId, 'someday')
    },
    [processTask],
  )

  const handleTrash = useCallback(
    (taskId: string) => {
      processTask(taskId, 'trash')
    },
    [processTask],
  )

  const handleMoveToProject = useCallback(
    (taskId: string, projectId: string) => {
      processTask(taskId, 'active', projectId)
      setOpenProjectId(null)
      setOpenDropdownId(null)
    },
    [processTask],
  )

  const toggleDropdown = useCallback((taskId: string) => {
    setOpenDropdownId(prev => (prev === taskId ? null : taskId))
    setOpenProjectId(null)
  }, [])

  const toggleProjectSelect = useCallback((taskId: string) => {
    setOpenProjectId(prev => (prev === taskId ? null : taskId))
  }, [])

  if (totalCount === 0) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('inboxTitle')}
        </h2>
        <div className="flex flex-col items-center py-8 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            {t('inboxEmpty')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {t('inboxTitle')}
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {t('processedCount', { processed: processedCount, total: totalCount })}
        </span>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {t('inboxDescription', { count: totalCount })}
      </p>

      <div className="space-y-2">
        {inboxTasks.map(task => {
          const isRemoving = removingIds.has(task.id)
          const isProcessed = processedMap.has(task.id)

          if (isProcessed && !isRemoving) return null

          return (
            <div
              key={task.id}
              className={`transition-all duration-300 ${
                isRemoving
                  ? 'translate-y-[-10px] opacity-0'
                  : 'translate-y-0 opacity-100'
              }`}
            >
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 p-3">
                <div className="mb-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleDoIt(task.id)}
                    disabled={processing}
                    className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors disabled:opacity-50"
                  >
                    {t('actionDoIt')}
                  </button>

                  <button
                    onClick={() => handleSomeday(task.id)}
                    disabled={processing}
                    className="inline-flex items-center rounded-lg bg-purple-100 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50"
                  >
                    {t('actionSomeday')}
                  </button>

                  <button
                    onClick={() => handleTrash(task.id)}
                    disabled={processing}
                    className="inline-flex items-center rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                  >
                    {t('actionDelete')}
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => toggleDropdown(task.id)}
                      disabled={processing}
                      className="inline-flex items-center rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
                    >
                      {t('actionMore')}
                      <svg className="ml-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {openDropdownId === task.id && (
                      <div className="absolute left-0 z-20 mt-1 w-48 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-lg">
                        <button
                          onClick={() => toggleProjectSelect(task.id)}
                          className="flex w-full items-center px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                        >
                          <svg className="mr-2 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                          {t('actionMoveToProject')}
                        </button>
                      </div>
                    )}

                    {openProjectId === task.id && (
                      <div className="absolute left-0 z-30 mt-1 max-h-48 w-56 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-lg">
                        {projects.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
                            {t('noProjects')}
                          </div>
                        ) : (
                          projects.map(project => (
                            <button
                              key={project.id}
                              onClick={() => handleMoveToProject(task.id, project.id)}
                              className="flex w-full items-center px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                            >
                              {project.color && (
                                <span
                                  className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: project.color }}
                                />
                              )}
                              {project.name}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {allProcessed && (
        <div className="mt-6 flex flex-col items-center py-4 text-center animate-[fadeIn_0.3s_ease-in]">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            {t('inboxAllProcessed')}
          </p>
        </div>
      )}

      <button
        onClick={onComplete}
        className="mt-4 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        {t('skipStep')}
      </button>
    </div>
  )
}
