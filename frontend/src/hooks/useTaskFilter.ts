import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { TaskFilters } from './useTasks'
import { useDebounce } from './useDebounce'

interface UseTaskFilterReturn {
  filters: TaskFilters
  searchInput: string
  setSearchInput: (v: string) => void
  updateFilter: <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => void
  clearFilters: () => void
  hasActiveFilters: boolean
}

export function useTaskFilter(
  defaultFilters?: Partial<TaskFilters>
): UseTaskFilterReturn {
  const defaultsRef = useRef(defaultFilters)
  defaultsRef.current = defaultFilters

  const [filters, setFilters] = useState<TaskFilters>(() => ({
    ...defaultFilters,
  }))
  const [searchInput, setSearchInput] = useState('')

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
  }, [])

  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.context_id ||
      filters.area_id ||
      filters.project_id ||
      filters.tag_id ||
      filters.is_completed !== undefined ||
      filters.due_date_from ||
      filters.due_date_to ||
      filters.search ||
      (filters.sort_by && filters.sort_by !== 'created_at') ||
      filters.sort_order === 'asc'
    )
  }, [filters])

  return { filters, searchInput, setSearchInput, updateFilter, clearFilters, hasActiveFilters }
}
