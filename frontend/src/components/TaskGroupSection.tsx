import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { TaskGroup } from '../utils/groupTasks'

interface TaskGroupSectionProps {
  group: TaskGroup
  children: React.ReactNode
  storageKey: string
}

export function TaskGroupSection({ group, children, storageKey }: TaskGroupSectionProps) {
  const { t } = useTranslation('tasks')
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, String(collapsed))
    } catch {}
  }, [collapsed, storageKey])

  const translatedLabel = t(group.label, { defaultValue: group.label })

  return (
    <div className="space-y-2">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors focus:outline-none"
      >
        {group.color && (
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />
        )}
        {group.icon && <span className="text-sm flex-shrink-0">{group.icon}</span>}
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
          {translatedLabel}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
          ({group.tasks.length})
        </span>
        <svg
          className={`h-4 w-4 ml-auto text-gray-400 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {!collapsed && <div className="space-y-2 pl-1">{children}</div>}
    </div>
  )
}
