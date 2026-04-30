import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjects } from '../../hooks/useProjects'
import { useReviewStore } from '../../stores/reviewStore'
import { db } from '../../db/database'
import { useAuthStore } from '../../stores/authStore'
import { v4 as uuidv4 } from 'uuid'

export function ReviewInboxStep() {
  const { t } = useTranslation('review')
  const { projects } = useProjects()
  const user = useAuthStore(s => s.user)
  const data = useReviewStore(s => s.data)
  const incrementInboxProcessed = useReviewStore(s => s.incrementInboxProcessed)
  const setStep = useReviewStore(s => s.setStep)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [showProjectPicker, setShowProjectPicker] = useState(false)

  const inboxTasks = data?.inbox_tasks ?? []
  const total = inboxTasks.length

  useEffect(() => {
    if (total === 0) {
      setStep('projects')
    }
  }, [total, setStep])

  useEffect(() => {
    if (currentIndex >= total && total > 0) {
      setStep('projects')
    }
  }, [currentIndex, total, setStep])

  const processTask = useCallback(
    async (taskId: string, targetStatus: string, projectId?: string) => {
      if (!user) return
      setProcessing(true)

      const now = new Date().toISOString()
      const updates: Record<string, unknown> = {
        gtdStatus: targetStatus,
        updatedAt: now,
        _syncStatus: 'modified',
      }
      if (projectId) updates.projectId = projectId

      await db.tasks.update(taskId, updates as never)
      await db.mutations.add({
        id: uuidv4(),
        entityType: 'task',
        entityId: taskId,
        action: 'move',
        payload: JSON.stringify({
          gtd_status: targetStatus,
          ...(projectId ? { project_id: projectId } : {}),
        }),
        timestamp: Date.now(),
        retryCount: 0,
        lastError: null,
      })

      incrementInboxProcessed()
      setCurrentIndex(prev => prev + 1)
      setShowProjectPicker(false)
      setProcessing(false)
    },
    [user, incrementInboxProcessed],
  )

  const currentTaskId = inboxTasks[currentIndex]?.id

  const handleDoIt = useCallback(() => {
    if (processing || !currentTaskId) return
    processTask(currentTaskId, 'active')
  }, [processing, currentTaskId, processTask])

  const handleSomeday = useCallback(() => {
    if (processing || !currentTaskId) return
    processTask(currentTaskId, 'someday')
  }, [processing, currentTaskId, processTask])

  const handleDelete = useCallback(() => {
    if (processing || !currentTaskId) return
    processTask(currentTaskId, 'trash')
  }, [processing, currentTaskId, processTask])

  const handleSelectProject = useCallback(
    (projectId: string) => {
      if (processing || !currentTaskId) return
      processTask(currentTaskId, 'active', projectId)
    },
    [processing, currentTaskId, processTask],
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (processing || showProjectPicker) return
      if (currentIndex >= total) return
      if (e.key === '1') handleDoIt()
      else if (e.key === '2') setShowProjectPicker(true)
      else if (e.key === '3') handleSomeday()
      else if (e.key === '4') handleDelete()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [processing, showProjectPicker, currentIndex, total, handleDoIt, handleSomeday, handleDelete])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showProjectPicker) {
        setShowProjectPicker(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showProjectPicker])

  if (total === 0) return null

  const currentTask = inboxTasks[currentIndex]
  if (!currentTask) return null

  const nextTasks = inboxTasks.slice(currentIndex + 1, currentIndex + 3)

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
          📥 {t('inboxTitle')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('inboxDescription')}
        </p>
      </div>

      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-3 uppercase tracking-wide">
        {t('taskNumberOf', { current: currentIndex + 1, total })}
      </p>

      <div className="rounded-xl border-2 border-indigo-500 dark:border-indigo-400 bg-white dark:bg-gray-800 p-6 mb-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {currentTask.title}
        </h3>
        {currentTask.description && (
          <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
            {currentTask.description}
          </p>
        )}
      </div>

      {showProjectPicker && (
        <div className="mb-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 p-3">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('selectProject')}
          </p>
          {projects.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500">{t('noProjects')}</p>
          ) : (
            <div className="max-h-40 overflow-y-auto space-y-1">
              {projects.map(project => (
                <button
                  key={project.id}
                  onClick={() => handleSelectProject(project.id)}
                  disabled={processing}
                  className="flex w-full items-center rounded-md px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  {project.color && (
                    <span
                      className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                  )}
                  {project.name}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setShowProjectPicker(false)}
            className="mt-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {t('cancel')}
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={handleDoIt}
          disabled={processing || showProjectPicker}
          className="flex flex-col items-center rounded-lg bg-indigo-600 px-4 py-3 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors disabled:opacity-50"
        >
          <span className="text-sm font-medium">{t('actionDoIt')}</span>
          <span className="text-[10px] opacity-70 mt-0.5">1</span>
        </button>

        <button
          onClick={() => setShowProjectPicker(true)}
          disabled={processing}
          className="flex flex-col items-center rounded-lg bg-gray-100 px-4 py-3 text-gray-700 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
        >
          <span className="text-sm font-medium">{t('actionMoveToProject')}</span>
          <span className="text-[10px] opacity-70 mt-0.5">2</span>
        </button>

        <button
          onClick={handleSomeday}
          disabled={processing || showProjectPicker}
          className="flex flex-col items-center rounded-lg bg-purple-100 px-4 py-3 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50"
        >
          <span className="text-sm font-medium">{t('actionSomeday')}</span>
          <span className="text-[10px] opacity-70 mt-0.5">3</span>
        </button>

        <button
          onClick={handleDelete}
          disabled={processing || showProjectPicker}
          className="flex flex-col items-center rounded-lg bg-red-100 px-4 py-3 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
        >
          <span className="text-sm font-medium">{t('actionDelete')}</span>
          <span className="text-[10px] opacity-70 mt-0.5">4</span>
        </button>
      </div>

      {nextTasks.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-2">
            {t('nextInQueue')}
          </p>
          <div className="space-y-2">
            {nextTasks.map(task => (
              <div
                key={task.id}
                className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30 px-4 py-2.5"
              >
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {task.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
