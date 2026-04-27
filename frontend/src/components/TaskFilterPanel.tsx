import { useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { TaskFilters as TaskFiltersType, GtdStatus } from '../hooks/useTasks'
import { useContexts } from '../hooks/useContexts'
import { useAreas } from '../hooks/useAreas'
import { useProjects } from '../hooks/useProjects'
import { useTags } from '../hooks/useTags'
import { useLocalStorage } from '../hooks/useLocalStorage'

interface TaskFilterPanelProps {
  filters: TaskFiltersType
  searchInput: string
  onSearchInput: (v: string) => void
  onUpdateFilter: <K extends keyof TaskFiltersType>(key: K, value: TaskFiltersType[K]) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
  activeFilterCount: number
  hideGtdStatus?: boolean
  hideProject?: boolean
  hideArea?: boolean
}

export function TaskFilterPanel({
  filters,
  searchInput,
  onSearchInput,
  onUpdateFilter,
  onClearFilters,
  hasActiveFilters,
  activeFilterCount,
  hideGtdStatus,
  hideProject,
  hideArea,
}: TaskFilterPanelProps) {
  const { t } = useTranslation('tasks')
  const { contexts } = useContexts()
  const { areas } = useAreas()
  const { projects } = useProjects()
  const { tags } = useTags()
  const [expanded, setExpanded] = useLocalStorage(
    'ui-filter-panel-expanded',
    false
  )
  const [searchOpen, setSearchOpen] = useLocalStorage(
    'ui-filter-search-open',
    false
  )
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchOpen) {
      requestAnimationFrame(() => searchRef.current?.focus())
    }
  }, [searchOpen])

  const selectClass =
    'w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500'

  const GTD_OPTIONS: { value: GtdStatus; labelKey: string }[] = [
    { value: 'inbox', labelKey: 'gtdInbox' },
    { value: 'active', labelKey: 'gtdActive' },
    { value: 'next', labelKey: 'gtdNext' },
    { value: 'waiting', labelKey: 'gtdWaiting' },
    { value: 'someday', labelKey: 'gtdSomeday' },
    { value: 'completed', labelKey: 'gtdCompleted' },
    { value: 'trash', labelKey: 'gtdTrash' },
  ]

  const SORT_OPTIONS = [
    { value: 'created_at', labelKey: 'sortCreated' },
    { value: 'title', labelKey: 'sortName' },
    { value: 'due_date', labelKey: 'sortDeadline' },
    { value: 'position', labelKey: 'sortPosition' },
  ]

  return (
    <div className="space-y-3">
      {searchOpen ? (
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative w-full md:flex-1">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={searchInput}
              onChange={(e) => onSearchInput(e.target.value)}
              placeholder={t('searchTasks')}
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => { onSearchInput(''); setSearchOpen(false); setExpanded(false) }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex gap-2 items-center">
            <button
              onClick={() => setExpanded(!expanded)}
              className={`px-3 py-2 text-xs font-medium border rounded-md transition-colors relative ${
                expanded
                  ? 'text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              {t('filters')}
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {hasActiveFilters && (
              <button
                onClick={onClearFilters}
                className="px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title={t('resetAllFilters')}
              >
                {t('resetFilters')}
              </button>
            )}

            <select
              value={filters.sort_by || 'created_at'}
              onChange={(e) => onUpdateFilter('sort_by', e.target.value || undefined)}
              className="px-2 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>

            <button
              onClick={() =>
                onUpdateFilter(
                  'sort_order',
                  filters.sort_order === 'desc' ? 'asc' : 'desc'
                )
              }
              className="px-2 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600"
              title={filters.sort_order === 'desc' ? t('sortDesc') : t('sortAsc')}
            >
              {filters.sort_order === 'desc' ? '↓' : '↑'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 relative"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title={t('resetAllFilters')}
            >
              {t('resetFilters')}
            </button>
          )}
        </div>
      )}

      {searchOpen && expanded && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {!hideGtdStatus && (
              <div>
                <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {t('filterGtdStatus')}
                </label>
                <select
                  value={filters.gtd_status || ''}
                  onChange={(e) => onUpdateFilter('gtd_status', (e.target.value || undefined) as GtdStatus)}
                  className={selectClass}
                >
                  <option value="">{t('allStatuses')}</option>
                  {GTD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t(opt.labelKey)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                {t('filterContext')}
              </label>
              <select
                value={filters.context_id || ''}
                onChange={(e) => onUpdateFilter('context_id', e.target.value || undefined)}
                className={selectClass}
              >
                <option value="">{t('allContexts')}</option>
                {contexts.map((ctx) => (
                  <option key={ctx.id} value={ctx.id}>
                    {ctx.name}
                  </option>
                ))}
              </select>
            </div>

            {!hideArea && (
              <div>
                <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {t('filterArea')}
                </label>
                <select
                  value={filters.area_id || ''}
                  onChange={(e) => onUpdateFilter('area_id', e.target.value || undefined)}
                  className={selectClass}
                >
                  <option value="">{t('allAreas')}</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!hideProject && (
              <div>
                <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {t('filterProject')}
                </label>
                <select
                  value={filters.project_id || ''}
                  onChange={(e) => onUpdateFilter('project_id', e.target.value || undefined)}
                  className={selectClass}
                >
                  <option value="">{t('allProjects')}</option>
                  {projects.filter((p) => p.is_active).map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                {t('filterTag')}
              </label>
              <select
                value={filters.tag_id || ''}
                onChange={(e) => onUpdateFilter('tag_id', e.target.value || undefined)}
                className={selectClass}
              >
                <option value="">{t('allTags')}</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                {t('filterDeadlineFrom')}
              </label>
              <input
                type="date"
                value={filters.due_date_from || ''}
                onChange={(e) => onUpdateFilter('due_date_from', e.target.value || undefined)}
                className={selectClass}
              />
            </div>

            <div>
              <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                {t('filterDeadlineTo')}
              </label>
              <input
                type="date"
                value={filters.due_date_to || ''}
                onChange={(e) => onUpdateFilter('due_date_to', e.target.value || undefined)}
                className={selectClass}
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={onClearFilters}
                className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
              >
                {t('resetAllFilters')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function HighlightText({ text, query }: { text: string; query?: string }) {
  if (!query || !query.trim()) return <>{text}</>

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(regex)

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 text-inherit rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}
