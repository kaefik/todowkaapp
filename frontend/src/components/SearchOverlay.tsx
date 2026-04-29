import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { httpClient } from '../api/httpClient'
import { Link } from 'react-router-dom'
import { useLocalStorage } from '../hooks/useLocalStorage'

interface TaskHit {
  id: string
  title: string
  gtd_status: string
  completed: boolean
  project: { id: string; name: string } | null
}

interface NamedItem {
  id: string
  name: string
  description?: string | null
  color?: string | null
}

type SectionType = 'tasks' | 'projects' | 'areas' | 'contexts' | 'tags'

interface ResultSection {
  type: SectionType
  items: TaskHit[] | NamedItem[]
}

interface Props {
  open: boolean
  onClose: () => void
}

export function SearchOverlay({ open, onClose }: Props) {
  const { t } = useTranslation('tasks')
  const { t: tNav } = useTranslation('nav')
  const [query, setQuery] = useState('')
  const [sections, setSections] = useState<ResultSection[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [caseSensitive] = useLocalStorage('search-case-sensitive', false)
  const [wholeWord] = useLocalStorage('search-whole-word', false)

  useEffect(() => {
    if (open) {
      setQuery('')
      setSections([])
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim()) {
      setSections([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const q = encodeURIComponent(query.trim())
        const extra = `&case_sensitive=${caseSensitive}&whole_word=${wholeWord}`
        const [tasksRes, projectsRes, areasRes, contextsRes, tagsRes] = await Promise.all([
          httpClient.get<{ items: TaskHit[]; total: number }>(`/tasks?search=${q}&limit=10${extra}`),
          httpClient.get<{ items: NamedItem[]; total: number }>(`/projects?search=${q}&limit=10${extra}`),
          httpClient.get<{ items: NamedItem[]; total: number }>(`/areas?search=${q}&limit=10${extra}`),
          httpClient.get<{ items: NamedItem[]; total: number }>(`/contexts?search=${q}&limit=10${extra}`),
          httpClient.get<{ items: NamedItem[]; total: number }>(`/tags?search=${q}&limit=10${extra}`),
        ])

        const result: ResultSection[] = []

        const tasks = tasksRes.data.items ?? []
        if (tasks.length > 0) result.push({ type: 'tasks', items: tasks })

        const projects = projectsRes.data.items ?? []
        if (projects.length > 0) result.push({ type: 'projects', items: projects })

        const areas = areasRes.data.items ?? []
        if (areas.length > 0) result.push({ type: 'areas', items: areas })

        const contexts = contextsRes.data.items ?? []
        if (contexts.length > 0) result.push({ type: 'contexts', items: contexts })

        const tags = tagsRes.data.items ?? []
        if (tags.length > 0) result.push({ type: 'tags', items: tags })

        setSections(result)
      } catch {
        setSections([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, caseSensitive, wholeWord])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const sectionLabels: Record<SectionType, string> = {
    tasks: t('searchSectionTasks'),
    projects: tNav('projects'),
    areas: tNav('areas'),
    contexts: tNav('contexts'),
    tags: tNav('tags'),
  }

  const statusLabels: Record<string, string> = {
    inbox: 'Inbox',
    next: 'Next',
    waiting: 'Waiting',
    someday: 'Someday',
    completed: t('statusCompleted'),
    trash: t('statusTrash'),
  }

  const totalResults = sections.reduce((sum, s) => sum + s.items.length, 0)

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative mx-auto max-w-lg mt-4 sm:mt-20 px-4">
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
              placeholder={t('searchAll')}
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

          <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto">
            {isLoading && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 dark:border-indigo-400" />
              </div>
            )}

            {!isLoading && query.trim() && totalResults === 0 && (
              <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                {t('searchNothingFound')}
              </div>
            )}

            {!isLoading && sections.map((section) => (
              <div key={section.type}>
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky top-0">
                  {sectionLabels[section.type]}
                </div>
                {section.type === 'tasks'
                  ? (section.items as TaskHit[]).map((task) => (
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
                    ))
                  : (section.items as NamedItem[]).map((item) => {
                      const linkMap: Record<string, string> = {
                        projects: `/projects/${item.id}`,
                        areas: `/areas/${item.id}`,
                        contexts: '/contexts',
                        tags: '/tags',
                      }
                      return (
                        <Link
                          key={item.id}
                          to={linkMap[section.type] || '/'}
                          onClick={onClose}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
                        >
                          {item.color ? (
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          ) : (
                            <span className="w-3 h-3 rounded-full flex-shrink-0 bg-gray-300 dark:bg-gray-600" />
                          )}
                          <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
                            {item.name}
                          </span>
                          {item.description && (
                            <span className="text-xs text-gray-400 dark:text-gray-500 truncate hidden sm:inline">
                              — {item.description}
                            </span>
                          )}
                        </Link>
                      )
                    })
                }
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
