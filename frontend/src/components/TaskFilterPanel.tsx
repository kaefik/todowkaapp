import { useState, useRef, useEffect } from 'react'
import type { TaskFilters as TaskFiltersType, GtdStatus } from '../hooks/useTasks'
import { useContexts } from '../hooks/useContexts'
import { useAreas } from '../hooks/useAreas'
import { useProjects } from '../hooks/useProjects'
import { useTags } from '../hooks/useTags'

const GTD_OPTIONS: { value: GtdStatus; label: string }[] = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'next', label: 'Next' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'someday', label: 'Someday' },
  { value: 'completed', label: 'Завершено' },
  { value: 'trash', label: 'Корзина' },
]

const SORT_OPTIONS = [
  { value: 'created_at', label: 'По дате создания' },
  { value: 'title', label: 'По названию' },
  { value: 'due_date', label: 'По дедлайну' },
  { value: 'position', label: 'По позиции' },
]

interface TaskFilterPanelProps {
  filters: TaskFiltersType
  searchInput: string
  onSearchInput: (v: string) => void
  onUpdateFilter: <K extends keyof TaskFiltersType>(key: K, value: TaskFiltersType[K]) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
  hideGtdStatus?: boolean
  hideProject?: boolean
}

export function TaskFilterPanel({
  filters,
  searchInput,
  onSearchInput,
  onUpdateFilter,
  onClearFilters,
  hasActiveFilters,
  hideGtdStatus,
  hideProject,
}: TaskFilterPanelProps) {
  const { contexts } = useContexts()
  const { areas } = useAreas()
  const { projects } = useProjects()
  const { tags } = useTags()
  const [expanded, setExpanded] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchOpen) {
      requestAnimationFrame(() => searchRef.current?.focus())
    }
  }, [searchOpen])

  const selectClass =
    'w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500'

  return (
    <div className="space-y-3">
      {searchOpen ? (
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
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
              placeholder="Поиск задач..."
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

          <button
            onClick={() => setExpanded(!expanded)}
            className={`px-3 py-2 text-xs font-medium border rounded-md transition-colors ${
              expanded
                ? 'text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                : 'text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            Фильтры
          </button>

          <select
            value={filters.sort_by || 'created_at'}
            onChange={(e) => onUpdateFilter('sort_by', e.target.value || undefined)}
            className="px-2 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
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
            title={filters.sort_order === 'desc' ? 'По убыванию' : 'По возрастанию'}
          >
            {filters.sort_order === 'desc' ? '↓' : '↑'}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setSearchOpen(true)}
          className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      )}

      {searchOpen && expanded && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {!hideGtdStatus && (
              <div>
                <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                  GTD-статус
                </label>
                <select
                  value={filters.gtd_status || ''}
                  onChange={(e) => onUpdateFilter('gtd_status', (e.target.value || undefined) as GtdStatus)}
                  className={selectClass}
                >
                  <option value="">Все статусы</option>
                  {GTD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                Контекст
              </label>
              <select
                value={filters.context_id || ''}
                onChange={(e) => onUpdateFilter('context_id', e.target.value || undefined)}
                className={selectClass}
              >
                <option value="">Все контексты</option>
                {contexts.map((ctx) => (
                  <option key={ctx.id} value={ctx.id}>
                    {ctx.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                Область
              </label>
              <select
                value={filters.area_id || ''}
                onChange={(e) => onUpdateFilter('area_id', e.target.value || undefined)}
                className={selectClass}
              >
                <option value="">Все области</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>

            {!hideProject && (
              <div>
                <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Проект
                </label>
                <select
                  value={filters.project_id || ''}
                  onChange={(e) => onUpdateFilter('project_id', e.target.value || undefined)}
                  className={selectClass}
                >
                  <option value="">Все проекты</option>
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
                Тег
              </label>
              <select
                value={filters.tag_id || ''}
                onChange={(e) => onUpdateFilter('tag_id', e.target.value || undefined)}
                className={selectClass}
              >
                <option value="">Все теги</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                Дедлайн от
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
                Дедлайн до
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
                Сбросить все фильтры
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
