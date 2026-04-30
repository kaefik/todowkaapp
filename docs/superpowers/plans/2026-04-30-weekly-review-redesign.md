# Weekly Review Redesign: Wizard + Миникарта

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Переработать Weekly Review — добавить миникарту слева с навигацией и прогрессом, переключить Inbox и Someday на карточный режим обработки по одной задаче с клавиатурными шорткатами.

**Architecture:** Layout = миникарта (220px) + рабочая область (flex:1). Zustand-стор хранит текущий шаг, данные API, прогресс по секциям и статистику. Inbox и Someday обрабатывают по одной задаче с кнопками-шорткатами.

**Tech Stack:** React 18, TypeScript, Zustand, Tailwind CSS 4, react-i18next

---

### Task 1: Zustand-стор для Review

**Files:**
- Create: `frontend/src/stores/reviewStore.ts`

> ⚠️ **Known Limitation:** Прогресс обзора хранится только в памяти (Zustand). 
> При перезагрузке страницы прогресс сбрасывается. Это ожидаемое поведение для MVP.

- [ ] **Step 1: Создать reviewStore.ts**

```typescript
import { create } from 'zustand'
import { reviewApi, type ReviewStatus } from '../api/review'

export type ReviewStep = 'inbox' | 'projects' | 'someday' | 'completion'

export interface ReviewStats {
  inboxProcessed: number
  nextActionsAdded: number
  somedayActivated: number
}

export interface SectionProgress {
  processed: number
  total: number
}

interface ReviewState {
  currentStep: ReviewStep
  data: ReviewStatus | null
  isLoading: boolean
  error: string | null
  stats: ReviewStats
  inboxProgress: SectionProgress
  somedayProgress: SectionProgress
  projectsProgress: SectionProgress

  fetchData: () => Promise<void>
  setStep: (step: ReviewStep) => void
  incrementInboxProcessed: () => void
  incrementSomedayActivated: () => void
  incrementNextActionsAdded: () => void
  markProjectReviewed: () => void
  resetStats: () => void
}

const INITIAL_STATS: ReviewStats = {
  inboxProcessed: 0,
  nextActionsAdded: 0,
  somedayActivated: 0,
}

export const useReviewStore = create<ReviewState>()((set, get) => ({
  currentStep: 'inbox',
  data: null,
  isLoading: true,
  error: null,
  stats: { ...INITIAL_STATS },
  inboxProgress: { processed: 0, total: 0 },
  somedayProgress: { processed: 0, total: 0 },
  projectsProgress: { processed: 0, total: 0 },

  fetchData: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await reviewApi.getStatus()
      set({
        data,
        isLoading: false,
        inboxProgress: { processed: 0, total: data.inbox_tasks.length },
        somedayProgress: { processed: 0, total: data.someday_tasks.length },
        projectsProgress: { processed: 0, total: data.active_projects.length },
      })
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load review data',
      })
    }
  },

  setStep: (step) => set({ currentStep: step }),

  incrementInboxProcessed: () =>
    set((s) => ({
      inboxProgress: { ...s.inboxProgress, processed: s.inboxProgress.processed + 1 },
      stats: { ...s.stats, inboxProcessed: s.stats.inboxProcessed + 1 },
    })),

  incrementSomedayActivated: () =>
    set((s) => ({
      somedayProgress: { ...s.somedayProgress, processed: s.somedayProgress.processed + 1 },
      stats: { ...s.stats, somedayActivated: s.stats.somedayActivated + 1 },
    })),

  incrementNextActionsAdded: () =>
    set((s) => ({
      stats: { ...s.stats, nextActionsAdded: s.stats.nextActionsAdded + 1 },
    })),

  markProjectReviewed: () =>
    set((s) => ({
      projectsProgress: { ...s.projectsProgress, processed: s.projectsProgress.processed + 1 },
    })),

  resetStats: () =>
    set({
      stats: { ...INITIAL_STATS },
      currentStep: 'inbox',
      data: null,
      isLoading: true,
      error: null,
      inboxProgress: { processed: 0, total: 0 },
      somedayProgress: { processed: 0, total: 0 },
      projectsProgress: { processed: 0, total: 0 },
    }),
}))
```

> ⚠️ **Known Limitation:** Прогресс сбрасывается при перезагрузке страницы.

- [ ] **Step 2: Проверить TypeScript**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -30`
Expected: Нет ошибок в reviewStore.ts

---

### Task 2: Компонент ReviewMinimap

**Files:**
- Create: `frontend/src/components/review/ReviewMinimap.tsx`

- [ ] **Step 1: Создать ReviewMinimap.tsx**

```tsx
import { useTranslation } from 'react-i18next'
import { useReviewStore, type ReviewStep, type SectionProgress } from '../../stores/reviewStore'

interface StepConfig {
  key: ReviewStep
  icon: string
  labelKey: string
  color: string
  activeColor: string
  bgColor: string
  borderColor: string
  progressBg: string
}

const STEPS: StepConfig[] = [
  { key: 'inbox', icon: '📥', labelKey: 'stepInbox', color: 'text-blue-700 dark:text-blue-400', activeColor: 'border-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-900/20', borderColor: 'border-blue-200 dark:border-blue-800', progressBg: 'bg-blue-400' },
  { key: 'projects', icon: '📁', labelKey: 'stepProjects', color: 'text-green-700 dark:text-green-400', activeColor: 'border-green-500', bgColor: 'bg-green-50 dark:bg-green-900/20', borderColor: 'border-green-200 dark:border-green-800', progressBg: 'bg-green-400' },
  { key: 'someday', icon: '💭', labelKey: 'stepSomeday', color: 'text-purple-700 dark:text-purple-400', activeColor: 'border-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-900/20', borderColor: 'border-purple-200 dark:border-purple-800', progressBg: 'bg-purple-400' },
  { key: 'completion', icon: '✅', labelKey: 'stepDone', color: 'text-gray-600 dark:text-gray-400', activeColor: 'border-gray-400', bgColor: 'bg-gray-50 dark:bg-gray-800', borderColor: 'border-gray-200 dark:border-gray-700', progressBg: 'bg-gray-400' },
]

function ProgressBar({ progress, bg }: { progress: SectionProgress; bg: string }) {
  if (progress.total === 0) return null
  const pct = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0
  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <div className="flex-1 h-1 rounded-full bg-gray-200 dark:bg-gray-700">
        <div className={`h-full rounded-full transition-all duration-300 ${bg}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-gray-400">
        {progress.processed}/{progress.total}
      </span>
    </div>
  )
}

export function ReviewMinimap() {
  const { t } = useTranslation('review')
  const { currentStep, setStep, inboxProgress, somedayProgress, projectsProgress, data } =
    useReviewStore()

  const progressMap: Record<ReviewStep, SectionProgress | null> = {
    inbox: inboxProgress,
    projects: projectsProgress,
    someday: somedayProgress,
    completion: null,
  }

  const totalProcessed = inboxProgress.processed + projectsProgress.processed + somedayProgress.processed
  const totalAll = inboxProgress.total + projectsProgress.total + somedayProgress.total
  const overallPct = totalAll > 0 ? Math.round((totalProcessed / totalAll) * 100) : 0

  const projectWithoutNext = (data?.active_projects ?? []).filter((p) => !p.has_next_action).length

  return (
    <div className="w-[220px] shrink-0 bg-gray-50 dark:bg-gray-900/50 border-r border-gray-200 dark:border-gray-700 p-3.5 flex flex-col">
      <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-2.5">
        {t('minimapTitle', { defaultValue: 'Обзор' })}
      </div>

      <div className="space-y-1.5">
        {STEPS.map((step) => {
          const isActive = currentStep === step.key
          const progress = progressMap[step.key]
          const isCompleted =
            progress && progress.total > 0 && progress.processed >= progress.total

          return (
            <button
              key={step.key}
              onClick={() => setStep(step.key)}
              className={`w-full text-left rounded-lg p-2.5 transition-all ${
                isActive
                  ? `${step.bgColor} border-2 ${step.activeColor} shadow-sm`
                  : isCompleted
                    ? 'bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[13px] font-semibold ${
                    isActive
                      ? step.color
                      : isCompleted
                        ? 'text-green-700 dark:text-green-400'
                        : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {step.icon} {t(step.labelKey)}
                </span>
                {isCompleted ? (
                  <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full px-1.5 py-0.5 font-semibold">
                    ✓
                  </span>
                ) : progress && progress.total > 0 ? (
                  <span
                    className={`text-[10px] rounded-full px-1.5 py-0.5 font-semibold ${
                      step.key === 'inbox'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : step.key === 'projects'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                          : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                    }`}
                  >
                    {progress.total}
                  </span>
                ) : null}
              </div>
              {progress && <ProgressBar progress={progress} bg={step.progressBg} />}
              {step.key === 'projects' && projectWithoutNext > 0 && !isCompleted && (
                <div className="text-[10px] text-red-500 mt-1">
                  ⚠ {t('minimapWithoutNext', { count: projectWithoutNext, defaultValue: `${projectWithoutNext} без next action` })}
                </div>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-auto pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="text-[10px] text-gray-400 mb-1.5">{t('minimapOverall', { defaultValue: 'Общий прогресс' })}</div>
        <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
            style={{ width: `${overallPct}%` }}
          />
        </div>
        <div className="text-[10px] text-gray-400 mt-1">
          {totalProcessed} {t('minimapOf', { defaultValue: 'из' })} {totalAll}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Проверить TypeScript**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -30`

---

### Task 3: Компонент ReviewInboxStep (карточный режим)

**Files:**
- Modify: `frontend/src/components/review/ReviewInbox.tsx`

- [ ] **Step 1: Переписать ReviewInbox.tsx в карточный режим**

Полная замена содержимого файла. Обработка по одной задаче с 4 кнопками, шорткаты 1-4, превью следующих 2 задач.

```tsx
import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjects } from '../../hooks/useProjects'
import { useReviewStore } from '../../stores/reviewStore'
import { httpClient } from '../../api/httpClient'
import { db } from '../../db/database'
import { useAuthStore } from '../../stores/authStore'
import { v4 as uuidv4 } from 'uuid'

export function ReviewInboxStep() {
  const { t } = useTranslation('review')
  const { data, incrementInboxProcessed, setStep } = useReviewStore()
  const { projects } = useProjects()
  const user = useAuthStore((s) => s.user)

  const tasks = data?.inbox_tasks ?? []
  const [currentIndex, setCurrentIndex] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [showProjectPicker, setShowProjectPicker] = useState(false)

  const currentTask = tasks[currentIndex] ?? null
  const nextTasks = tasks.slice(currentIndex + 1, currentIndex + 3)
  const isEmpty = tasks.length === 0
  const isDone = currentIndex >= tasks.length

  useEffect(() => {
    if (isEmpty) {
      setStep('projects')
    }
  }, [isEmpty, setStep])

  useEffect(() => {
    if (isDone && !isEmpty) {
      const timer = setTimeout(() => setStep('projects'), 400)
      return () => clearTimeout(timer)
    }
  }, [isDone, isEmpty, setStep])

  const processTask = useCallback(
    async (action: 'active' | 'someday' | 'trash', projectId?: string) => {
      if (!currentTask || !user) return
      setProcessing(true)

      try {
        const now = new Date().toISOString()
        const updates: Record<string, unknown> = {
          gtdStatus: action === 'someday' ? 'someday' : action === 'trash' ? 'trash' : 'active',
          updatedAt: now,
          _syncStatus: 'modified',
        }
        if (projectId) {
          updates.projectId = projectId
        }

        await db.tasks.update(currentTask.id, updates)
        await db.mutations.add({
          id: uuidv4(),
          entityType: 'task',
          entityId: currentTask.id,
          action: 'move',
          payload: JSON.stringify({
            gtd_status: updates.gtdStatus,
            ...(projectId ? { project_id: projectId } : {}),
          }),
          timestamp: Date.now(),
          retryCount: 0,
          lastError: null,
        })

        incrementInboxProcessed()
        setCurrentIndex((i) => i + 1)
      } finally {
        setProcessing(false)
        setShowProjectPicker(false)
      }
    },
    [currentTask, user, incrementInboxProcessed],
  )

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (processing || !currentTask || showProjectPicker) return
      if (e.key === '1') processTask('active')
      else if (e.key === '2') setShowProjectPicker(true)
      else if (e.key === '3') processTask('someday')
      else if (e.key === '4') processTask('trash')
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [processing, currentTask, showProjectPicker, processTask])

  if (isEmpty || isDone) return null

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          📥 {t('inboxTitle')}
        </h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {t('inboxDescription', { count: tasks.length })}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="text-[11px] text-gray-400 mb-1.5">
          {t('taskNumberOf', {
            defaultValue: `ЗАДАЧА ${currentIndex + 1} ИЗ ${tasks.length}`,
            current: currentIndex + 1,
            total: tasks.length,
          })}
        </div>

        <div className="bg-white dark:bg-gray-800 border-2 border-indigo-500 dark:border-indigo-400 rounded-xl p-5 mb-4 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {currentTask.title}
          </h3>
          {currentTask.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{currentTask.description}</p>
          )}
        </div>

        {showProjectPicker && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {t('actionMoveToProject')}:
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {projects.length === 0 ? (
                <div className="text-xs text-gray-400 py-1">{t('noProjects')}</div>
              ) : (
                projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => processTask('active', project.id)}
                    disabled={processing}
                    className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    {project.color && (
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                    )}
                    {project.name}
                  </button>
                ))
              )}
            </div>
            <button
              onClick={() => setShowProjectPicker(false)}
              className="mt-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {t('cancel')}
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5 mb-5">
          <button
            onClick={() => processTask('active')}
            disabled={processing}
            className="p-3.5 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg text-left transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/30 disabled:opacity-50"
          >
            <div className="font-bold text-blue-700 dark:text-blue-400 text-sm">⌨ 1. {t('actionDoIt')}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">→ Next Action</div>
          </button>
          <button
            onClick={() => setShowProjectPicker(true)}
            disabled={processing}
            className="p-3.5 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg text-left transition-colors hover:bg-green-100 dark:hover:bg-green-900/30 disabled:opacity-50"
          >
            <div className="font-bold text-green-700 dark:text-green-400 text-sm">📁 2. {t('actionMoveToProject')}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">{t('selectProject', { defaultValue: 'Выбрать проект' })}</div>
          </button>
          <button
            onClick={() => processTask('someday')}
            disabled={processing}
            className="p-3.5 bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-lg text-left transition-colors hover:bg-purple-100 dark:hover:bg-purple-900/30 disabled:opacity-50"
          >
            <div className="font-bold text-purple-700 dark:text-purple-400 text-sm">💭 3. {t('actionSomeday')}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">→ Someday/Maybe</div>
          </button>
          <button
            onClick={() => processTask('trash')}
            disabled={processing}
            className="p-3.5 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg text-left transition-colors hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50"
          >
            <div className="font-bold text-red-700 dark:text-red-400 text-sm">🗑 4. {t('actionDelete')}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">{t('actionDeleteDesc', { defaultValue: 'Удалить задачу' })}</div>
          </button>
        </div>

        {nextTasks.length > 0 && (
          <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
            <div className="text-[11px] text-gray-400 mb-2">{t('nextInQueue', { defaultValue: 'ДАЛЕЕ В ОЧЕРЕДИ' })}</div>
            <div className="flex gap-2">
              {nextTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-2 text-xs text-gray-500 truncate"
                >
                  {task.title}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Проверить TypeScript**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -30`

---

### Task 4: Компонент ReviewProjectsStep (адаптация)

**Files:**
- Modify: `frontend/src/components/review/ReviewProjects.tsx`

- [ ] **Step 1: Адаптировать ReviewProjects для нового layout**

Заменить содержимое. Компонент читает данные из reviewStore, вызывает markProjectReviewed, показывает проблемные проекты с красной рамкой.

```tsx
import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useTasks, type CreateTask } from '../../hooks/useTasks'
import { useReviewStore } from '../../stores/reviewStore'

export function ReviewProjectsStep() {
  const { t } = useTranslation('review')
  const { data, markProjectReviewed, incrementNextActionsAdded, setStep } = useReviewStore()
  const { addTask } = useTasks()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [taskTitle, setTaskTitle] = useState('')
  const [creatingForId, setCreatingForId] = useState<string | null>(null)
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set())

  const projects = data?.active_projects ?? []

  const handleToggleExpand = useCallback((projectId: string) => {
    setExpandedId((prev) => (prev === projectId ? null : projectId))
    setTaskTitle('')
  }, [])

  const handleCreate = useCallback(
    async (projectId: string) => {
      const title = taskTitle.trim()
      if (!title) return

      setCreatingForId(projectId)
      try {
        const taskData: CreateTask = {
          title,
          project_id: projectId,
          gtd_status: 'active',
        }
        await addTask(taskData)
        incrementNextActionsAdded()
        setExpandedId(null)
        setTaskTitle('')
      } finally {
        setCreatingForId(null)
      }
    },
    [addTask, taskTitle, incrementNextActionsAdded],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, projectId: string) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleCreate(projectId)
      }
      if (e.key === 'Escape') {
        setExpandedId(null)
        setTaskTitle('')
      }
    },
    [handleCreate],
  )

  const handleMarkReviewed = useCallback(
    (projectId: string) => {
      if (!reviewedIds.has(projectId)) {
        setReviewedIds((prev) => new Set(prev).add(projectId))
        markProjectReviewed()
      }
    },
    [reviewedIds, markProjectReviewed],
  )

  const handleNext = useCallback(() => {
    projects.forEach((p) => handleMarkReviewed(p.id))
    setStep('someday')
  }, [projects, handleMarkReviewed, setStep])

  if (projects.length === 0) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            📁 {t('projectsTitle')}
          </h2>
          <span className="text-xs text-gray-500 dark:text-gray-400">{t('projectsEmpty')}</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400">{t('projectsEmpty')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              📁 {t('projectsTitle')}
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t('projectsDescription', { count: projects.length })}
            </span>
          </div>
          <button
            onClick={handleNext}
            className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
          >
            Someday →
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {projects.map((project) => {
          const isExpanded = expandedId === project.id
          const isCreating = creatingForId === project.id
          const withoutNext = !project.has_next_action

          return (
            <div
              key={project.id}
              className={`rounded-xl overflow-hidden ${
                withoutNext
                  ? 'border-2 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/10'
                  : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${
                      project.has_next_action ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate block">
                      {project.name}
                    </span>
                    {project.description && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate block">
                        {project.description}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {withoutNext ? (
                    <span className="text-xs font-medium text-red-600 dark:text-red-400 whitespace-nowrap">
                      {t('noNextAction')}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-green-600 dark:text-green-400 whitespace-nowrap">
                      ✓
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleExpand(project.id)
                      handleMarkReviewed(project.id)
                    }}
                    className="px-2.5 py-1 text-xs font-medium rounded-md text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                  >
                    {t('addNextAction')}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, project.id)}
                      placeholder={t('nextActionPlaceholder')}
                      className="flex-1 px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                      autoFocus
                      disabled={isCreating}
                    />
                    <button
                      type="button"
                      onClick={() => handleCreate(project.id)}
                      disabled={!taskTitle.trim() || isCreating}
                      className="px-3 py-1.5 text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {isCreating && (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      )}
                      {t('create')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Проверить TypeScript**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -30`

---

### Task 5: Компонент ReviewSomedayStep (карточный режим)

**Files:**
- Modify: `frontend/src/components/review/ReviewSomeday.tsx`

- [ ] **Step 1: Переписать ReviewSomeday.tsx в карточный режим**

```tsx
import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useReviewStore } from '../../stores/reviewStore'
import { httpClient } from '../../api/httpClient'

export function ReviewSomedayStep() {
  const { t } = useTranslation('review')
  const { data, setStep, incrementSomedayProcessed } = useReviewStore()

  const tasks = data?.someday_tasks ?? []
  const [currentIndex, setCurrentIndex] = useState(0)
  const [keepingIds, setKeepingIds] = useState<Set<string>>(new Set())
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentTask = tasks[currentIndex] ?? null
  const nextTasks = tasks.slice(currentIndex + 1, currentIndex + 3)
  const isEmpty = tasks.length === 0
  const isDone = currentIndex >= tasks.length

  useEffect(() => {
    if (isEmpty) {
      setStep('completion')
    }
  }, [isEmpty, setStep])

  useEffect(() => {
    if (isDone && !isEmpty) {
      const timer = setTimeout(() => setStep('completion'), 400)
      return () => clearTimeout(timer)
    }
  }, [isDone, isEmpty, setStep])

  const handleAction = useCallback(
    async (action: 'active' | 'trash' | 'keep') => {
      if (!currentTask) return

      if (action === 'keep') {
        setKeepingIds((prev) => new Set(prev).add(currentTask.id))
        incrementProcessed()
        setCurrentIndex((i) => i + 1)
        return
      }

      setProcessing(true)
      setError(null)

      try {
        await httpClient.patch(`/tasks/${currentTask.id}`, {
          gtd_status: action,
        })
        incrementProcessed()
        setCurrentIndex((i) => i + 1)
      } catch (err) {
        setError(err instanceof Error ? err.message : t('somedayActionFailed'))
      } finally {
        setProcessing(false)
      }
    },
    [currentTask, incrementProcessed, t],
  )

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (processing || !currentTask) return
      if (e.key === '1') handleAction('active')
      else if (e.key === '2') handleAction('keep')
      else if (e.key === '3') handleAction('trash')
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [processing, currentTask, handleAction])

  if (isEmpty || isDone) return null

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              💭 {t('somedayTitle')}
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t('somedayDescription', { count: tasks.length })}
            </span>
          </div>
          <button
            onClick={() => setStep('completion')}
            className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
          >
            {t('complete')}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="text-[11px] text-gray-400 mb-1.5">
          {t('taskNumberOf', {
            defaultValue: `ЗАДАЧА ${currentIndex + 1} ИЗ ${tasks.length}`,
            current: currentIndex + 1,
            total: tasks.length,
          })}
        </div>

        {error && (
          <p className="text-sm text-red-500 dark:text-red-400 mb-3">{error}</p>
        )}

        <div className="bg-white dark:bg-gray-800 border-2 border-purple-500 dark:border-purple-400 rounded-xl p-5 mb-4 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {currentTask.title}
          </h3>
          {currentTask.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{currentTask.description}</p>
          )}
          {currentTask.due_date && (
            <div className="text-[11px] text-purple-500 mt-2">
              {t('addedOn', { defaultValue: 'Добавлено' })} {new Date(currentTask.due_date).toLocaleDateString()}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2.5 mb-5">
          <button
            onClick={() => handleAction('active')}
            disabled={processing}
            className="p-3.5 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg text-center transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/30 disabled:opacity-50"
          >
            <div className="font-bold text-blue-700 dark:text-blue-400 text-sm">⚡ {t('somedayActivate')}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">1 — → Inbox</div>
          </button>
          <button
            onClick={() => handleAction('keep')}
            disabled={processing}
            className="p-3.5 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg text-center transition-colors hover:bg-green-100 dark:hover:bg-green-900/30 disabled:opacity-50"
          >
            <div className="font-bold text-green-700 dark:text-green-400 text-sm">✋ {t('somedayKeep')}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">2 — Enter</div>
          </button>
          <button
            onClick={() => handleAction('trash')}
            disabled={processing}
            className="p-3.5 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg text-center transition-colors hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50"
          >
            <div className="font-bold text-red-700 dark:text-red-400 text-sm">🗑 {t('somedayTrash')}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">3</div>
          </button>
        </div>

        {nextTasks.length > 0 && (
          <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
            <div className="text-[11px] text-gray-400 mb-2">{t('nextInQueue', { defaultValue: 'ДАЛЕЕ В ОЧЕРЕДИ' })}</div>
            <div className="flex gap-2">
              {nextTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-2 text-xs text-gray-500 truncate"
                >
                  {task.title}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

**Важно:** В reviewStore нужно добавить `incrementSomedayProcessed` — это делается в Task 1. Если его нет, добавьте аналогично `incrementInboxProcessed`:

```typescript
incrementSomedayProcessed: () =>
  set((s) => ({
    somedayProgress: { ...s.somedayProgress, processed: s.somedayProgress.processed + 1 },
  })),
```

- [ ] **Step 2: Проверить TypeScript**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -30`

---

### Task 6: Экран завершения ReviewCompletion

**Files:**
- Modify: `frontend/src/components/review/ReviewCompletion.tsx`

- [ ] **Step 1: Переписать ReviewCompletion.tsx**

```tsx
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { reviewApi } from '../../api/review'
import { useReviewStore } from '../../stores/reviewStore'

export function ReviewCompletion({ onGoHome }: { onGoHome: () => void }) {
  const { t } = useTranslation('review')
  const { stats, data } = useReviewStore()
  const [isCompleting, setIsCompleting] = useState(true)
  const [completedAt, setCompletedAt] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    reviewApi
      .complete()
      .then((res) => {
        if (!cancelled) {
          setCompletedAt(res.completed_at)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsCompleting(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const reviewCount = data?.review_count ?? 0
  const nextReviewDate = completedAt
    ? new Date(new Date(completedAt).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
    : '—'

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-5">
        <svg
          className="w-10 h-10 text-green-600 dark:text-green-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        {t('completionTitle')}
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {t('completionSubtitle', { defaultValue: 'Вы молодец. Система в порядке.' })}
      </p>

      <div className="grid grid-cols-3 gap-4 w-full max-w-md mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.inboxProcessed}</div>
          <div className="text-[11px] text-gray-500 mt-1">
            {t('completionInboxProcessed', { count: stats.inboxProcessed })}
          </div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.nextActionsAdded}</div>
          <div className="text-[11px] text-gray-500 mt-1">
            {t('completionNextAdded', { defaultValue: 'Next action добавлено', count: stats.nextActionsAdded })}
          </div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.somedayActivated}</div>
          <div className="text-[11px] text-gray-500 mt-1">
            {t('completionSomedayActivated', { count: stats.somedayActivated })}
          </div>
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3 w-full max-w-md mb-6">
        <div className="flex justify-between text-sm text-gray-500">
          <span>
            {t('completionReviewNumber', { defaultValue: 'Это ваш' })}{' '}
            <strong className="text-gray-900 dark:text-gray-100">{reviewCount + 1}-й</strong>{' '}
            {t('completionReviewWord', { defaultValue: 'обзор' })}
          </span>
          <span>
            {t('completionNextReview', { defaultValue: 'Следующий:' })}{' '}
            <strong className="text-gray-900 dark:text-gray-100">{nextReviewDate}</strong>
          </span>
        </div>
      </div>

      <button
        onClick={onGoHome}
        disabled={isCompleting}
        className="px-8 py-3 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {isCompleting && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        )}
        {t('goHome')}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Проверить TypeScript**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -30`

---

### Task 7: Переработка страницы Review.tsx

**Files:**
- Modify: `frontend/src/routes/Review.tsx`

- [ ] **Step 1: Переписать Review.tsx**

Полная замена. Layout: миникарта слева + рабочая область справа. Состояние в reviewStore.

```tsx
import { useEffect, useCallback } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import { useReviewStore } from '../stores/reviewStore'
import { ReviewMinimap } from '../components/review/ReviewMinimap'
import { ReviewInboxStep } from '../components/review/ReviewInbox'
import { ReviewProjectsStep } from '../components/review/ReviewProjects'
import { ReviewSomedayStep } from '../components/review/ReviewSomeday'
import { ReviewCompletion } from '../components/review/ReviewCompletion'

export function Review() {
  const { isAuthenticated } = useAuthStore()
  const { t } = useTranslation('review')
  const navigate = useNavigate()
  const { currentStep, isLoading, error, data, fetchData, resetStats } = useReviewStore()

  useEffect(() => {
    if (!isAuthenticated) return
    fetchData()
    return () => {
      resetStats()
    }
  }, [isAuthenticated])

  const handleCancel = useCallback(() => {
    navigate('/')
  }, [navigate])

  const handleGoHome = useCallback(() => {
    navigate('/', { replace: true })
  }, [navigate])

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        handleCancel()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [handleCancel])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    )
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'inbox':
        return <ReviewInboxStep />
      case 'projects':
        return <ReviewProjectsStep />
      case 'someday':
        return <ReviewSomedayStep />
      case 'completion':
        return <ReviewCompletion onGoHome={handleGoHome} />
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <ReviewMinimap />

      <div className="flex-1 flex flex-col relative">
        <button
          onClick={handleCancel}
          className="absolute top-4 right-4 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors z-10"
        >
          {t('cancel')}
        </button>

        {renderStep()}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Проверить TypeScript**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -30`

---

### Task 8: Обновление i18n-ключей

**Files:**
- Modify: `frontend/src/i18n/locales/ru/review.json`
- Modify: `frontend/src/i18n/locales/en/review.json`

- [ ] **Step 1: Обновить ru/review.json**

Добавить новые ключи (миникарта, карточный режим, завершение):

```json
{
  "title": "Еженедельный обзор",
  "minimapTitle": "Обзор",
  "minimapOverall": "Общий прогресс",
  "minimapOf": "из",
  "minimapWithoutNext": "{{count}} без next action",
  "taskNumberOf": "ЗАДАЧА {{current}} ИЗ {{total}}",
  "nextInQueue": "ДАЛЕЕ В ОЧЕРЕДИ",
  "selectProject": "Выбрать проект",
  "addedOn": "Добавлено",
  "completionSubtitle": "Вы молодец. Система в порядке.",
  "completionNextAdded": "Next action добавлено",
  "completionReviewNumber": "Это ваш",
  "completionReviewWord": "обзор",
  "completionNextReview": "Следующий:",
  "stepInbox": "Входящие",
  "stepProjects": "Проекты",
  "stepSomeday": "Когда-нибудь",
  "stepDone": "Готово",
  "back": "Назад",
  "next": "Далее",
  "complete": "Завершить обзор",
  "cancel": "Отмена",
  "inboxTitle": "Обзор входящих",
  "inboxDescription": "У вас {{count}} задач(и) во входящих. Просмотрите и решите, что с ними делать.",
  "inboxEmpty": "Входящие пусты. Отлично!",
  "projectsTitle": "Обзор проектов",
  "projectsDescription": "У вас {{count}} активных проектов. Проверьте, у всех ли есть следующее действие.",
  "projectsEmpty": "Нет активных проектов.",
  "somedayTitle": "Когда-нибудь / Может быть",
  "somedayDescription": "У вас {{count}} задач(и) в списке «Когда-нибудь». Просмотрите — возможно, пора что-то из этого сделать.",
  "somedayEmpty": "Список «Когда-нибудь» пуст.",
  "noNextAction": "Нет следующего действия",
  "addNextAction": "Добавить next action",
  "nextActionPlaceholder": "Название задачи...",
  "create": "Создать",
  "somedayRemaining": "Осталось {{count}} задач(и)",
  "somedayActivate": "Активировать",
  "somedayTrash": "В корзину",
  "somedayKeep": "Оставить",
  "somedayKept": "Оставлено",
  "somedayAllReviewed": "Все задачи просмотрены!",
  "somedayReviewedCount": "Обработано {{count}} задач(и)",
  "somedayActionFailed": "Не удалось выполнить действие",
  "actionDoIt": "Сделать",
  "actionSomeday": "Когда-нибудь",
  "actionDelete": "Удалить",
  "actionMore": "Ещё",
  "actionMoveToProject": "В проект",
  "actionDeleteDesc": "Удалить задачу",
  "processedCount": "Обработано {{processed}} из {{total}}",
  "inboxAllProcessed": "Входящие пусты!",
  "noProjects": "Нет проектов",
  "skipStep": "Пропустить шаг",
  "completionTitle": "Обзор завершён!",
  "completionInboxProcessed": "Обработано входящих: {{count}}",
  "completionProjectsWithoutNext": "Проектов без next action: {{count}}",
  "completionSomedayActivated": "Someday активировано: {{count}}",
  "goHome": "На главную"
}
```

- [ ] **Step 2: Обновить en/review.json**

```json
{
  "title": "Weekly Review",
  "minimapTitle": "Review",
  "minimapOverall": "Overall progress",
  "minimapOf": "of",
  "minimapWithoutNext": "{{count}} without next action",
  "taskNumberOf": "TASK {{current}} OF {{total}}",
  "nextInQueue": "NEXT IN QUEUE",
  "selectProject": "Select project",
  "addedOn": "Added on",
  "completionSubtitle": "Well done. Your system is in order.",
  "completionNextAdded": "Next actions added",
  "completionReviewNumber": "This is your",
  "completionReviewWord": "review",
  "completionNextReview": "Next:",
  "stepInbox": "Inbox",
  "stepProjects": "Projects",
  "stepSomeday": "Someday/Maybe",
  "stepDone": "Done",
  "back": "Back",
  "next": "Next",
  "complete": "Complete Review",
  "cancel": "Cancel",
  "inboxTitle": "Inbox Review",
  "inboxDescription": "You have {{count}} item(s) in your inbox. Review and decide what to do with them.",
  "inboxEmpty": "Your inbox is empty. Great job!",
  "projectsTitle": "Projects Review",
  "projectsDescription": "You have {{count}} active project(s). Check that each has a next action.",
  "projectsEmpty": "No active projects.",
  "somedayTitle": "Someday / Maybe",
  "somedayDescription": "You have {{count}} item(s) in your Someday list. Review them — maybe it's time to act on some.",
  "somedayEmpty": "Your Someday list is empty.",
  "noNextAction": "No next action",
  "addNextAction": "Add next action",
  "nextActionPlaceholder": "Task title...",
  "create": "Create",
  "somedayRemaining": "{{count}} remaining",
  "somedayActivate": "Activate",
  "somedayTrash": "Move to trash",
  "somedayKeep": "Keep",
  "somedayKept": "Kept",
  "somedayAllReviewed": "All tasks reviewed!",
  "somedayReviewedCount": "{{count}} task(s) processed",
  "somedayActionFailed": "Action failed",
  "actionDoIt": "Do It",
  "actionSomeday": "Someday",
  "actionDelete": "Delete",
  "actionMore": "More",
  "actionMoveToProject": "Move to Project",
  "actionDeleteDesc": "Delete task",
  "processedCount": "Processed {{processed}} of {{total}}",
  "inboxAllProcessed": "Inbox is empty!",
  "noProjects": "No projects",
  "skipStep": "Skip step",
  "completionTitle": "Review Complete!",
  "completionInboxProcessed": "Inbox processed: {{count}}",
  "completionProjectsWithoutNext": "Projects without next action: {{count}}",
  "completionSomedayActivated": "Someday activated: {{count}}",
  "goHome": "Go Home"
}
```

---

### Task 9: Удаление ReviewWizard и добавление incrementSomedayProcessed

**Files:**
- Delete: `frontend/src/components/review/ReviewWizard.tsx`
- Modify: `frontend/src/stores/reviewStore.ts`

- [ ] **Step 1: Добавить `incrementSomedayProcessed` в reviewStore**

В `frontend/src/stores/reviewStore.ts` добавить метод (если его нет из Task 1):

```typescript
incrementSomedayProcessed: () =>
  set((s) => ({
    somedayProgress: { ...s.somedayProgress, processed: s.somedayProgress.processed + 1 },
  })),
```

Этот метод нужен для ReviewSomedayStep — вызывается при каждом действии (activate/keep/trash).

- [ ] **Step 2: Удалить ReviewWizard.tsx**

Run: `rm frontend/src/components/review/ReviewWizard.tsx`

- [ ] **Step 3: Убедиться что нет импортов ReviewWizard**

Run: `cd frontend && rg "ReviewWizard" src/`
Expected: Нет результатов

---

### Task 10: Обновление features.md

**Files:**
- Modify: `docs/features.md`

- [ ] **Step 1: Обновить секцию Weekly Review в features.md**

Найти блок про Weekly Review и обновить описание:

```markdown
### Weekly Review с миникартой ✅
- **Layout:** Миникарта (220px) слева + рабочая область справа
- **Миникарта:** Навигация по секциям, прогресс-бары, бейджи задач, предупреждения
- **Inbox:** Карточный режим — обработка по одной задаче с 4 кнопками (Сделать/В проект/Когда-нибудь/Удалить)
- **Клавиатурные шорткаты:** 1-4 для Inbox, 1-3 для Someday, Escape для отмены
- **Projects:** Список с акцентом на проекты без next action (красная рамка), inline-форма добавления
- **Someday:** Карточный режим — обработка по одной с 3 кнопками (Активировать/Оставить/Корзина)
- **Завершение:** Статистика (Inbox/Next action/Someday), номер обзора, дата следующего
- **Zustand:** reviewStore для состояния обзора
- **Свободная навигация:** Переход к любой секции через миникарту
- **Реализовано:** 30.04.2026 (переработка)
```

---

### Task 11: Проверка сборки

- [ ] **Step 1: Запустить TypeScript проверку**

Run: `cd frontend && npx tsc --noEmit`
Expected: Нет ошибок

- [ ] **Step 2: Запустить ESLint**

Run: `cd frontend && npm run lint`
Expected: Нет ошибок

- [ ] **Step 3: Запустить сборку**

Run: `cd frontend && npm run build`
Expected: Успешная сборка

- [ ] **Step 4: Коммит**

```bash
git add -A
git commit -m "refactor: redesign weekly review with minimap and card-by-card processing"
```
