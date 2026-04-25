import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { db } from '../db/database'
import { useGtdCounts } from '../hooks/useGtdCounts'
import { useAuthStore } from '../stores/authStore'
import { v4 as uuidv4 } from 'uuid'
import { GtdTaskList } from './GtdTaskList'
import { ConfirmDialog } from '../components/ConfirmDialog'

export function Trash() {
  const { t } = useTranslation('tasks')
  const [isClearing, setIsClearing] = useState(false)
  const [clearError, setClearError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const { counts } = useGtdCounts()
  const user = useAuthStore(s => s.user)
  const isEmpty = counts.trash === 0

  const handleClearTrash = () => {
    setShowClearConfirm(true)
  }

  const confirmClearTrash = async () => {
    setShowClearConfirm(false)
    if (!user) return

    setIsClearing(true)
    setClearError(null)
    try {
      const trashTasks = await db.tasks
        .where('[userId+gtdStatus]')
        .equals([user.id, 'trash'])
        .filter(t => t._syncStatus !== 'deleted')
        .toArray()

      const now = new Date().toISOString()
      for (const task of trashTasks) {
        await db.tasks.update(task.id, {
          _syncStatus: 'deleted',
          updatedAt: now,
        })
        await db.mutations.add({
          id: uuidv4(),
          entityType: 'task',
          entityId: task.id,
          action: 'delete',
          payload: null,
          timestamp: Date.now(),
          retryCount: 0,
          lastError: null,
        })
      }
      setRefreshKey((k) => k + 1)
    } catch {
      setClearError(t('clearTrashFailed'))
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('trashTitle')}</h1>
        <button
          onClick={handleClearTrash}
          disabled={isClearing || isEmpty}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-900"
        >
          {isClearing ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {t('clearing')}
            </>
          ) : (
            t('clearTrash')
          )}
        </button>
      </div>

      {clearError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {clearError}
        </div>
      )}

      <GtdTaskList gtdStatus="trash" title="" key={refreshKey} />

      <ConfirmDialog
        open={showClearConfirm}
        title={t('clearTrashConfirm')}
        message={t('clearTrashMessage')}
        confirmText={t('clearBtn')}
        variant="danger"
        onConfirm={confirmClearTrash}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  )
}
