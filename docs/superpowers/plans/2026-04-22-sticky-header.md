# Sticky Header — План реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Зафиксировать верхнюю шапку приложения при прокрутке на мобильных и десктопе, добавить десктопную шапку с поиском.

**Architecture:** Мобильный header получает `sticky top-0 z-30`. Новый десктопный header (hidden lg:block) добавляется перед мобильным с тем же sticky. Десктопный sidebar сдвигается ниже шапки (`top-16`). Поиск реализован как модальный SearchOverlay, использующий существующий API endpoint `GET /api/tasks?search=`.

**Tech Stack:** React 18, TypeScript, Tailwind CSS 4, Zustand, React Router v7

---

## Файловая структура

| Файл | Действие | Ответственность |
|------|----------|-----------------|
| `frontend/src/components/AppLayout.tsx` | Изменить | Добавить sticky классы, новый десктопный header, сдвиг sidebar |
| `frontend/src/components/SearchOverlay.tsx` | Создать | Полноэкранный поиск по задачам |
| `frontend/src/components/TaskDetailModal.tsx` | Без изменений | Используется из SearchOverlay для открытия задач |

---

### Task 1: Sticky мобильная шапка + десктопная шапка

**Files:**
- Modify: `frontend/src/components/AppLayout.tsx`

- [ ] **Step 1: Добавить sticky классы к мобильному header и создать десктопный header**

В `AppLayout.tsx` заменить весь блок `return` для авторизованного пользователя (строки 161-221). Добавить `useState` для поиска, импорт `SearchOverlay`, добавить `sticky top-0 z-30` к мобильному header, добавить новый десктопный header перед мобильным, сдвинуть десктопный sidebar через `top-16`.

```tsx
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useGtdCounts } from '../hooks/useGtdCounts'
import { InstallPrompt } from './InstallPrompt'
import { NotificationBell } from './NotificationBell'
import { StatusLight } from './StatusLight'
import { SearchOverlay } from './SearchOverlay'

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  // ... без изменений (строки 9-146)
}

export function AppLayout() {
  const { isAuthenticated, user } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <main><Outlet /></main>
        <InstallPrompt />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Десктопная шапка */}
      <header className="hidden lg:flex sticky top-0 z-30 bg-white dark:bg-gray-800 shadow-sm dark:shadow-gray-900/50 items-center h-16 px-6">
        <Link to="/" className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center">
          Todowka <StatusLight />
        </Link>
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="ml-8 flex-1 max-w-md text-left px-3 py-1.5 text-sm text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Поиск задач...
        </button>
        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          <Link to="/profile" className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
            {user?.username}
          </Link>
        </div>
      </header>

      {/* Мобильная шапка */}
      <header className="bg-white dark:bg-gray-800 shadow-sm dark:shadow-gray-900/50 lg:hidden sticky top-0 z-30">
        <div className="flex items-center h-16 px-4">
          <button
            type="button"
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link to="/" className="ml-3 text-xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center">
            Todowka <StatusLight />
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <NotificationBell />
          </div>
        </div>
      </header>

      {/* Мобильный sidebar drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-xl z-50 p-4">
            <div className="flex items-center justify-between mb-4">
              <Link to="/" className="text-xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center" onClick={() => setSidebarOpen(false)}>
                Todowka <StatusLight />
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <SidebarContent onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Десктопный sidebar */}
      <aside className="hidden lg:block fixed top-16 bottom-0 left-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
        <SidebarContent />
      </aside>

      <main className="p-4 lg:ml-64 lg:p-8">
        <Outlet />
      </main>

      <InstallPrompt />

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
```

Ключевые изменения:
- Импортирован `SearchOverlay` и добавлен `useState` для `searchOpen`
- Извлечён `user` из `useAuthStore` для десктопного header
- Мобильный header: `sticky top-0 z-30`, добавлена кнопка поиска (иконка лупы)
- Новый десктопный header: `hidden lg:flex sticky top-0 z-30`, содержит логотип, поисковый инпут-плейсхолдер, NotificationBell, username
- Десктопный sidebar: `inset-y-0` заменён на `top-16 bottom-0`
- `<SearchOverlay>` рендерится в конце контейнера

- [ ] **Step 2: Проверить TypeScript компиляцию**

Run: `cd frontend && npx tsc --noEmit`
Expected: Ошибок нет (кроме отсутствующего `SearchOverlay` — будет исправлено в Task 2)

- [ ] **Step 3: Проверить линтер**

Run: `cd frontend && npm run lint`
Expected: Нет ошибок

---

### Task 2: Компонент SearchOverlay

**Files:**
- Create: `frontend/src/components/SearchOverlay.tsx`

- [ ] **Step 1: Создать SearchOverlay компонент**

```tsx
import { useState, useEffect, useRef } from 'react'
import { httpClient } from '../api/httpClient'
import { Link } from 'react-router-dom'

interface TaskHit {
  id: string
  title: string
  gtd_status: string
  project: { id: string; name: string } | null
}

interface Props {
  open: boolean
  onClose: () => void
}

export function SearchOverlay({ open, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TaskHit[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

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
        const res = await httpClient.get<{ tasks: TaskHit[]; total: number }>(
          `/tasks?search=${encodeURIComponent(query.trim())}&limit=20`
        )
        setResults(res.data.tasks)
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
    completed: 'Выполнено',
    trash: 'Корзина',
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
              placeholder="Поиск задач..."
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
                Ничего не найдено
              </div>
            )}

            {!isLoading && results.map((task) => (
              <Link
                key={task.id}
                to={`/projects/${task.project?.id}`}
                onClick={onClose}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
              >
                <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
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
```

Компонент:
- Принимает `open` и `onClose` props
- Debounce 300ms на поиск
- Использует `GET /api/tasks?search=...&limit=20` через `httpClient`
- Escape закрывает, клик по backdrop закрывает
- Показывает статус задачи рядом с заголовком
- Клик по результату → переход на проект задачи и закрытие

- [ ] **Step 2: Проверить TypeScript компиляцию**

Run: `cd frontend && npx tsc --noEmit`
Expected: Ошибок нет

- [ ] **Step 3: Проверить линтер**

Run: `cd frontend && npm run lint`
Expected: Нет ошибок

---

### Task 3: Проверка и фиксация

- [ ] **Step 1: Запустить dev-сервер и проверить визуально**

Run: `cd frontend && npm run dev`

Проверить:
1. На мобильном размере (<1024px): шапка закреплена при скролле, иконка поиска открывает SearchOverlay
2. На десктопе (>1024px): верхняя панель закреплена, sidebar начинается ниже неё, поиск работает
3. OfflineBanner отображается поверх шапки
4. Тёмная тема корректна
5. Модалки (TaskEditModal и др.) поверх SearchOverlay

- [ ] **Step 2: Обновить docs/features.md**

Добавить запись о новой возможности в соответствующую категорию.

- [ ] **Step 3: Коммит**

```bash
git add frontend/src/components/AppLayout.tsx frontend/src/components/SearchOverlay.tsx docs/features.md docs/superpowers/
git commit -m "feat: sticky header on mobile and desktop with search overlay"
```
