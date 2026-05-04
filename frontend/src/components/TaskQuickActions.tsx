import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { Task } from '../hooks/useTasks'

interface TaskQuickActionsProps {
  task: Task
  onComplete: () => void
  onEdit: () => void
  onChangeDate: () => void
  onChangeProject: () => void
  onDelete: () => void
  onRestore?: () => void
  position: { x: number; y: number }
  isOpen: boolean
  onClose: () => void
}

const ACTION_ICONS: Record<string, string> = {
  complete: '✓',
  edit: '✏️',
  postpone: '📅',
  project: '📁',
  delete: '🗑️',
  restore: '↩️',
}

export function TaskQuickActions({
  task,
  onComplete,
  onEdit,
  onChangeDate,
  onChangeProject,
  onDelete,
  onRestore,
  position,
  isOpen,
  onClose,
}: TaskQuickActionsProps) {
  const { t } = useTranslation('tasks')
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const actions = [
    { icon: ACTION_ICONS.complete, label: task.completed ? t('restore') : t('statusCompleted'), onClick: onComplete, primary: true },
    { icon: ACTION_ICONS.edit, label: t('editBtn'), onClick: onEdit },
    { icon: ACTION_ICONS.postpone, label: t('postponeForTomorrow'), onClick: onChangeDate },
    { icon: ACTION_ICONS.project, label: t('changeProject'), onClick: onChangeProject },
    ...(onRestore ? [{ icon: ACTION_ICONS.restore, label: t('restore'), onClick: onRestore }] : [{ icon: ACTION_ICONS.delete, label: t('deleteBtn'), onClick: onDelete, danger: true }]),
  ]

  return (
    <div
      ref={popoverRef}
      className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-2 z-50 min-w-48 animate-scale-in"
      style={{
        left: Math.min(position.x, window.innerWidth - 200),
        top: Math.min(position.y, window.innerHeight - 300),
      }}
    >
      {task.due_date && (
        <div className="px-2 py-1 text-[10px] text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700 mb-1">
          {t('quickActionsDue', { date: new Date(task.due_date).toLocaleDateString() })}
        </div>
      )}
      {actions.map((action, index) => (
        <button
          key={index}
          type="button"
          onClick={() => {
            action.onClick()
            onClose()
          }}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            action.danger
              ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
              : action.primary
              ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <span className="text-base w-6 text-center">{action.icon}</span>
          <span className="flex-1 text-left">{action.label}</span>
        </button>
      ))}
    </div>
  )
}