import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjects } from '../../hooks/useProjects'
import { useReviewStore } from '../../stores/reviewStore'
import { db } from '../../db/database'
import { useAuthStore } from '../../stores/authStore'
import { v4 as uuidv4 } from 'uuid'

function ProgressDots({ current, total }: { current: number; total: number }) {
  const dots = Math.min(total, 12)
  const filled = Math.min(current, dots)
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: dots }).map((_, i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full transition-all ${
            i < filled
              ? 'bg-indigo-500 dark:bg-indigo-400'
              : 'bg-gray-300 dark:bg-gray-600'
          }`}
        />
      ))}
      {total > 12 && <span className="text-xs text-gray-400 ml-1">+{total - 12}</span>}
    </div>
  )
}

export function ReviewInboxStep() {
  const { t } = useTranslation('review')
  const { projects } = useProjects()
  const user = useAuthStore((s) => s.user)
  const data = useReviewStore((s) => s.data)
  const incrementInboxProcessed = useReviewStore((s) => s.incrementInboxProcessed)
  const setStep = useReviewStore((s) => s.setStep)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [showProjectPicker, setShowProjectPicker] = useState(false)

  const inboxTasks = data?.inbox_tasks ?? []
  const total = inboxTasks.length

  useEffect(() => {
    if (total === 0) {
      setStep('dashboard')
    }
  }, [total, setStep])

  useEffect(() => {
    if (currentIndex >= total && total > 0) {
      setStep('dashboard')
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
      setCurrentIndex((prev) => prev + 1)
      setShowProjectPicker(false)
      setProcessing(false)
    },
    [user, incrementInboxProcessed],
  )

  const handleSkip = useCallback(() => {
    if (processing) return
    setCurrentIndex((prev) => prev + 1)
  }, [processing])

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
      else if (e.key === 's' || e.key === 'S') handleSkip()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [processing, showProjectPicker, currentIndex, total, handleDoIt, handleSomeday, handleDelete, handleSkip])

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
    <div className="flex-1 flex flex-col">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <button
          onClick={() => setStep('dashboard')}
          className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          {t('backToDashboard')}
        </button>
        <ProgressDots current={currentIndex} total={total} />
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {currentIndex + 1}/{total}
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 max-w-lg mx-auto w-full">
        <div className="rounded-2xl border-2 border-indigo-500 dark:border-indigo-400 bg-white dark:bg-gray-800 p-8 mb-8 shadow-sm w-full text-center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {currentTask.title}
          </h3>
          {currentTask.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap mt-3">
              {currentTask.description}
            </p>
          )}
        </div>

        {nextTasks.length > 0 && (
          <div className="mb-6 w-full">
            <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mb-1.5 uppercase tracking-wider">
              {t('nextInQueue')}
            </p>
            <div className="space-y-1">
              {nextTasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-lg bg-gray-50 dark:bg-gray-700/30 px-3 py-2"
                >
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{task.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {showProjectPicker && (
          <div className="mb-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 p-3 w-full">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('selectProject')}
            </p>
            {projects.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">{t('noProjects')}</p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {projects.map((project) => (
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

        <div className="flex items-center gap-2 w-full">
          <button
            onClick={handleDoIt}
            disabled={processing || showProjectPicker}
            className="flex-1 flex flex-col items-center rounded-lg bg-indigo-600 px-3 py-3 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors disabled:opacity-50"
          >
            <span className="text-sm font-medium">{t('actionDoIt')}</span>
            <span className="text-[10px] opacity-70">1</span>
          </button>
          <button
            onClick={() => setShowProjectPicker(true)}
            disabled={processing}
            className="flex-1 flex flex-col items-center rounded-lg bg-gray-100 px-3 py-3 text-gray-700 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
          >
            <span className="text-sm font-medium">{t('actionMoveToProject')}</span>
            <span className="text-[10px] opacity-70">2</span>
          </button>
          <button
            onClick={handleSomeday}
            disabled={processing || showProjectPicker}
            className="flex-1 flex flex-col items-center rounded-lg bg-purple-100 px-3 py-3 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50"
          >
            <span className="text-sm font-medium">{t('actionSomeday')}</span>
            <span className="text-[10px] opacity-70">3</span>
          </button>
          <button
            onClick={handleDelete}
            disabled={processing || showProjectPicker}
            className="flex-1 flex flex-col items-center rounded-lg bg-red-100 px-3 py-3 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
          >
            <span className="text-sm font-medium">{t('actionDelete')}</span>
            <span className="text-[10px] opacity-70">4</span>
          </button>
        </div>

        <button
          onClick={handleSkip}
          disabled={processing}
          className="mt-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          {t('actionSkip')} (S)
        </button>
      </div>
    </div>
  )
}
