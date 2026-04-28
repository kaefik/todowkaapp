import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { TaskFilters, GroupBy } from '../hooks/useTasks'

interface SortGroupPopoverProps {
  filters: TaskFilters
  onUpdateFilter: <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => void
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        active
          ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-600'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-transparent hover:bg-gray-200 dark:hover:bg-gray-600'
      }`}
    >
      {children}
    </button>
  )
}

export function SortGroupPopover({ filters, onUpdateFilter }: SortGroupPopoverProps) {
  const { t } = useTranslation('tasks')
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const GROUP_OPTIONS: { value: GroupBy | undefined; labelKey: string }[] = [
    { value: undefined, labelKey: 'groupNone' },
    { value: 'project', labelKey: 'groupProject' },
    { value: 'area', labelKey: 'groupArea' },
    { value: 'context', labelKey: 'groupContext' },
    { value: 'due_date', labelKey: 'groupDueDate' },
    { value: 'gtd_status', labelKey: 'groupGtdStatus' },
  ]

  const SORT_OPTIONS: { value: string; labelKey: string }[] = [
    { value: 'due_date', labelKey: 'sortDeadline' },
    { value: 'title', labelKey: 'sortName' },
    { value: 'created_at', labelKey: 'sortCreated' },
    { value: 'updated_at', labelKey: 'sortUpdated' },
    { value: 'completed_at', labelKey: 'sortCompletedAt' },
    { value: 'position', labelKey: 'sortPosition' },
  ]

  const hasGroup = filters.group_by !== undefined
  const hasCustomSort = filters.sort_by !== undefined && filters.sort_by !== 'created_at'
  const isActive = hasGroup || hasCustomSort

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`p-2 rounded-md border transition-colors relative ${
          isActive
            ? 'text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
            : 'text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
        }`}
        title={t('viewSettings')}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        {isActive && (
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-indigo-500" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 z-50 w-72">
          <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
            {t('popoverGroup')}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {GROUP_OPTIONS.map((opt) => (
              <Chip
                key={opt.value ?? 'none'}
                active={filters.group_by === opt.value}
                onClick={() => onUpdateFilter('group_by', opt.value as GroupBy | undefined)}
              >
                {t(opt.labelKey)}
              </Chip>
            ))}
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700 my-3" />

          <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
            {t('popoverSort')}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {SORT_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                active={(filters.sort_by || 'created_at') === opt.value}
                onClick={() => onUpdateFilter('sort_by', opt.value as string | undefined)}
              >
                {t(opt.labelKey)}
              </Chip>
            ))}
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700 my-3" />

          <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
            {t('popoverDirection')}
          </div>
          <div className="flex gap-1.5">
            <Chip
              active={filters.sort_order !== 'asc'}
              onClick={() => onUpdateFilter('sort_order', 'desc')}
            >
              ↓ {t('sortDesc')}
            </Chip>
            <Chip
              active={filters.sort_order === 'asc'}
              onClick={() => onUpdateFilter('sort_order', 'asc')}
            >
              ↑ {t('sortAsc')}
            </Chip>
          </div>
        </div>
      )}
    </div>
  )
}
