import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { httpClient } from '../api/httpClient'
import { Link } from 'react-router-dom'

interface TaskHit {
  id: string
  title: string
  gtd_status: string
  completed: boolean
  project: { id: string; name: string } | null
}

interface Props {
  open: boolean
  onClose: () => void
}

export function SearchOverlay({ open, onClose }: Props) {
  const { t } = useTranslation('tasks')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TaskHit[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim()) {
      setResults([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await httpClient.get<{ items: TaskHit[]; total: number }>(
          `/tasks?search=${encodeURIComponent(query.trim())}&limit=20`
        )
        setResults(res.data.items ?? [])
      } catch {
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const statusLabels: Record<string, string> = {
    inbox: 'Inbox',
    next: 'Next',
    waiting: 'Waiting',
    someday: 'Someday',
    completed: t('statusCompleted'),
    trash: t('statusTrash'),
  }

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative mx-auto max-w-lg mt-20 px-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center px-4 border-b border-gray-200 dark:border-gray-700">
            <svg className="h-5 w-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchTasks')}
              className="w-full px-3 py-4 text-sm bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 dark:border-indigo-400" />
              </div>
            )}

            {!isLoading && query.trim() && results.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                {t('searchNothingFound')}
              </div>
            )}

            {!isLoading && results.map((task) => (
              <Link
                key={task.id}
                to={`/projects/${task.project?.id}`}
                onClick={onClose}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
              >
                <span className={`text-sm truncate${task.completed ? ' text-gray-400 dark:text-gray-500 line-through decoration-2 decoration-gray-400 dark:decoration-gray-500' : ' text-gray-900 dark:text-gray-100'}`}>
                  {task.title}
                </span>
                <span className="ml-2 flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">
                  {statusLabels[task.gtd_status] || task.gtd_status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
