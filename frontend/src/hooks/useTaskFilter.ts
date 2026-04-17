import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { TaskFilters } from './useTasks'
import { useDebounce } from './useDebounce'

interface StoredFilters {
  context_id?: string
  area_id?: string
  tag_id?: string
  is_completed?: boolean
  due_date_from?: string
  due_date_to?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

interface StoredUiState {
  filters: StoredFilters
  searchQuery: string
}

function buildStorageKey(defaultFilters?: Partial<TaskFilters>): string {
  const parts: string[] = ['ui-task-filters']
  if (defaultFilters?.gtd_status) parts.push(defaultFilters.gtd_status)
  if (defaultFilters?.project_id) parts.push(defaultFilters.project_id)
  return parts.join('-')
}

const loadStoredFilters = (storageKey: string): StoredUiState => {
  try {
    const stored = localStorage.getItem(storageKey)
    return stored ? JSON.parse(stored) : { filters: {}, searchQuery: '' }
  } catch {
    return { filters: {}, searchQuery: '' }
  }
}

const saveFilters = (storageKey: string, filters: TaskFilters, searchQuery: string) => {
  try {
    const persistable: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(filters)) {
      if (key !== 'gtd_status' && key !== 'project_id') {
        persistable[key] = value
      }
    }
    localStorage.setItem(storageKey, JSON.stringify({ filters: persistable, searchQuery }))
  } catch (error) {
    console.error('Error saving filters to localStorage:', error)
  }
}

interface UseTaskFilterReturn {
  filters: TaskFilters
  searchInput: string
  setSearchInput: (v: string) => void
  updateFilter: <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => void
  clearFilters: () => void
  hasActiveFilters: boolean
  activeFilterCount: number
}

export function useTaskFilter(
  defaultFilters?: Partial<TaskFilters>
): UseTaskFilterReturn {
  const defaultsRef = useRef(defaultFilters)
  defaultsRef.current = defaultFilters

  const storageKey = buildStorageKey(defaultFilters)

  const stored = loadStoredFilters(storageKey)

  const [filters, setFilters] = useState<TaskFilters>(() => ({
    ...stored.filters,
    ...defaultFilters,
  }))
  const [searchInput, setSearchInput] = useState(stored.searchQuery)

  const debouncedSearch = useDebounce(searchInput, 300)

  useEffect(() => {
    setFilters((prev) => {
      const next = { ...prev }
      if (debouncedSearch) {
        next.search = debouncedSearch
      } else {
        delete next.search
      }
      return next
    })
  }, [debouncedSearch])

  useEffect(() => {
    saveFilters(storageKey, filters, searchInput)
  }, [storageKey, filters, searchInput])

  const updateFilter = useCallback(
    <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => {
      setFilters((prev) => {
        const next = { ...prev }
        if (value === '' || value === undefined || value === null) {
          delete next[key]
        } else {
          next[key] = value
        }
        return next
      })
    },
    []
  )

  const clearFilters = useCallback(() => {
    setFilters({ ...defaultsRef.current })
    setSearchInput('')
    localStorage.removeItem(storageKey)
  }, [storageKey])

  const hasActiveFilters = useMemo(() => {
    const defaults = defaultsRef.current ?? {}
    const hasNonDefault =
      (filters.context_id && filters.context_id !== defaults.context_id) ||
      (filters.area_id && filters.area_id !== defaults.area_id) ||
      (filters.project_id && filters.project_id !== defaults.project_id) ||
      (filters.tag_id && filters.tag_id !== defaults.tag_id) ||
      (filters.is_completed !== undefined && filters.is_completed !== defaults.is_completed) ||
      (filters.search && filters.search !== defaults.search)
    const hasSort =
      (filters.sort_by && filters.sort_by !== 'created_at' && filters.sort_by !== defaults.sort_by) ||
      (filters.sort_order === 'asc' && filters.sort_order !== defaults.sort_order)
    return !!(hasNonDefault || hasSort)
  }, [filters])

  const activeFilterCount = useMemo(() => {
    const defaults = defaultsRef.current ?? {}
    let count = 0
    if (filters.context_id && filters.context_id !== defaults.context_id) count++
    if (filters.area_id && filters.area_id !== defaults.area_id) count++
    if (filters.project_id && filters.project_id !== defaults.project_id) count++
    if (filters.tag_id && filters.tag_id !== defaults.tag_id) count++
    if (filters.is_completed !== undefined && filters.is_completed !== defaults.is_completed) count++
    if (filters.search && filters.search !== defaults.search) count++
    if (filters.sort_by && filters.sort_by !== 'created_at' && filters.sort_by !== defaults.sort_by) count++
    if (filters.sort_order === 'asc' && filters.sort_order !== defaults.sort_order) count++
    if (filters.due_date_from && filters.due_date_from !== (defaults as TaskFilters).due_date_from) count++
    if (filters.due_date_to && filters.due_date_to !== (defaults as TaskFilters).due_date_to) count++
    return count
  }, [filters])

  return { filters, searchInput, setSearchInput, updateFilter, clearFilters, hasActiveFilters, activeFilterCount }
}
