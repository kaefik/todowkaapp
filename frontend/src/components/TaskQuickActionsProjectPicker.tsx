import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjects } from '../hooks/useProjects'

interface TaskQuickActionsProjectPickerProps {
  currentProjectId: string | null
  onSelect: (projectId: string | null) => void
  onClose: () => void
  isOpen: boolean
}

export function TaskQuickActionsProjectPicker({
  currentProjectId,
  onSelect,
  onClose,
  isOpen,
}: TaskQuickActionsProjectPickerProps) {
  const { t } = useTranslation('tasks')
  const { projects } = useProjects()
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const activeProjects = projects.filter((p) => p.is_active)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        ref={popoverRef}
        className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 z-10 min-w-64 max-w-80 max-h-[70vh] overflow-y-auto animate-scale-in"
      >
        <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700 mb-1">
        {t('changeProject')}
      </div>
      <button
        type="button"
        onClick={() => {
          onSelect(null)
          onClose()
        }}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
          currentProjectId === null
            ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        <span className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600" />
        <span>{t('noProject')}</span>
      </button>
      {activeProjects.map((project) => (
        <button
          key={project.id}
          type="button"
          onClick={() => {
            onSelect(project.id)
            onClose()
          }}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            currentProjectId === project.id
              ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          {project.color && (
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
          )}
          {!project.color && <span className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600" />}
          <span>{project.name}</span>
        </button>
      ))}
      {activeProjects.length === 0 && (
        <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">
          {t('noProject')}
        </div>
      )}
      </div>
    </div>
  )
}