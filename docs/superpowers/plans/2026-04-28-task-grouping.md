# Task Grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add visual task grouping — collapsible sections with headers for projects, areas, contexts, due dates, and GTD status — on all pages that have a TaskFilterPanel.

**Architecture:** Frontend-only. All grouping logic runs client-side using data already in IndexedDB. Grouping is a visual transformation applied after existing sorting. No backend changes.

**Tech Stack:** React 18, TypeScript, Tailwind CSS 4, Zustand, i18next, vitest + @testing-library/react

---

## File Structure

### New files
| File | Responsibility |
|------|---------------|
| `frontend/src/utils/groupTasks.ts` | Pure grouping function + types |
| `frontend/src/components/TaskGroupSection.tsx` | Collapsible group header component |

### Modified files
| File | Change |
|------|--------|
| `frontend/src/hooks/useTasks.ts` | Add `GroupBy` type, extend `TaskFilters` with `group_by` |
| `frontend/src/hooks/useTaskFilter.ts` | Persist `group_by` in localStorage |
| `frontend/src/components/TaskFilterPanel.tsx` | Add group-by dropdown + `updated_at`/`completed_at` sort options |
| `frontend/src/components/TaskListView.tsx` | Conditional grouped rendering via `TaskGroupSection` |
| `frontend/src/i18n/locales/ru/tasks.json` | New translation keys |
| `frontend/src/i18n/locales/en/tasks.json` | New translation keys |
| `docs/features.md` | Document grouping feature |

---

## Task 1: Add GroupBy type and extend TaskFilters

**Files:**
- Modify: `frontend/src/hooks/useTasks.ts:11,97-110`

- [ ] **Step 1: Add GroupBy type alias**

In `frontend/src/hooks/useTasks.ts`, add this type after the existing `GtdStatus` type (line 11):

```typescript
export type GroupBy = 'project' | 'area' | 'context' | 'due_date' | 'gtd_status'
```

- [ ] **Step 2: Add AreaBrief type**

In `frontend/src/hooks/useTasks.ts`, add after `ContextBrief` interface (after line 34):

```typescript
export interface AreaBrief {
  id: string
  name: string
  color: string | null
}
```

- [ ] **Step 3: Add `area` field to Task interface**

In the `Task` interface, add `area` field after `area_id` (after line 43):

```typescript
  area: AreaBrief | null
```

- [ ] **Step 4: Extend TaskFilters interface**

Add `group_by` field to `TaskFilters` interface (after line 109):

```typescript
export interface TaskFilters {
  gtd_status?: GtdStatus
  context_id?: string
  area_id?: string
  project_id?: string
  no_project?: boolean
  tag_id?: string
  is_completed?: boolean
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  due_date_from?: string
  due_date_to?: string
  group_by?: GroupBy
}
```

- [ ] **Step 5: Add area resolution to dbTaskToUi mapper**

In `frontend/src/db/mappers.ts`:

Add `area` field to `UiTask` interface (after line 12, `area_id`):

```typescript
  area: { id: string; name: string; color: string | null } | null
```

In the `dbTaskToUi` function, after the context resolution block (after line 65), add area resolution:

```typescript
  let area = null
  if (task.areaId) {
    const a = await db.areas.get(task.areaId)
    if (a && a._syncStatus !== 'deleted') {
      area = { id: a.id, name: a.name, color: a.color }
    }
  }
```

In the return object, add `area` after `context` (after line 77):

```typescript
    area,
```

- [ ] **Step 6: Fix existing tests that use Task type**

Tests that create mock Task objects will need `area: null` added. Run tests to find which ones:

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -40`

Fix each test file by adding `area: null` to mock Task objects.

- [ ] **Step 7: Verify compilation**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add frontend/src/hooks/useTasks.ts frontend/src/db/mappers.ts frontend/src
git commit -m "feat: add GroupBy type, AreaBrief, area field on Task, extend TaskFilters"
```

---

## Task 2: Add i18n keys

**Files:**
- Modify: `frontend/src/i18n/locales/ru/tasks.json`
- Modify: `frontend/src/i18n/locales/en/tasks.json`

- [ ] **Step 1: Add Russian translations**

Append to the end of `frontend/src/i18n/locales/ru/tasks.json` (before the closing `}`), adding these keys:

```json
  "groupBy": "Группировать",
  "groupNone": "Без группировки",
  "groupProject": "По проекту",
  "groupArea": "По области",
  "groupContext": "По контексту",
  "groupDueDate": "По дедлайну",
  "groupGtdStatus": "По GTD-статусу",
  "groupOverdue": "Просрочено",
  "groupToday": "Сегодня",
  "groupTomorrow": "Завтра",
  "groupNext7Days": "Ближайшие 7 дней",
  "groupLater": "Позже",
  "groupNoDueDate": "Без дедлайна",
  "sortUpdated": "По дате обновления",
  "sortCompletedAt": "По дате выполнения"
```

Note: add a comma after the last existing key (`"deadlineTime"`) before adding these.

- [ ] **Step 2: Add English translations**

Same for `frontend/src/i18n/locales/en/tasks.json`:

```json
  "groupBy": "Group by",
  "groupNone": "No grouping",
  "groupProject": "By project",
  "groupArea": "By area",
  "groupContext": "By context",
  "groupDueDate": "By due date",
  "groupGtdStatus": "By GTD status",
  "groupOverdue": "Overdue",
  "groupToday": "Today",
  "groupTomorrow": "Tomorrow",
  "groupNext7Days": "Next 7 days",
  "groupLater": "Later",
  "groupNoDueDate": "No deadline",
  "sortUpdated": "By updated date",
  "sortCompletedAt": "By completed date"
```

- [ ] **Step 3: Verify JSON is valid**

Run: `cd frontend && node -e "JSON.parse(require('fs').readFileSync('src/i18n/locales/ru/tasks.json','utf8')); JSON.parse(require('fs').readFileSync('src/i18n/locales/en/tasks.json','utf8')); console.log('OK')"`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/i18n/locales/ru/tasks.json frontend/src/i18n/locales/en/tasks.json
git commit -m "feat: add i18n keys for task grouping and new sort options"
```

---

## Task 3: Create groupTasks utility

**Files:**
- Create: `frontend/src/utils/groupTasks.ts`

- [ ] **Step 1: Create the utility**

Create `frontend/src/utils/groupTasks.ts`:

```typescript
import type { Task, GroupBy, GtdStatus } from '../hooks/useTasks'

export interface TaskGroup {
  key: string
  label: string
  color?: string | null
  icon?: string | null
  order: number
  tasks: Task[]
}

const NO_GROUP_KEY = '__none__'

const GTD_STATUS_ORDER: Record<GtdStatus, number> = {
  inbox: 0,
  active: 1,
  next: 2,
  waiting: 3,
  someday: 4,
  completed: 5,
  trash: 6,
}

function getDueDateBucket(dueDate: string | null): { key: string; order: number } {
  if (!dueDate) return { key: 'no_due_date', order: 100 }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const due = new Date(dueDate)
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return { key: 'overdue', order: 0 }
  if (diffDays === 0) return { key: 'today', order: 1 }
  if (diffDays === 1) return { key: 'tomorrow', order: 2 }
  if (diffDays <= 7) return { key: 'next7days', order: 3 }
  return { key: 'later', order: 4 }
}

export function groupTasks(tasks: Task[], groupBy: GroupBy): TaskGroup[] {
  const groupMap = new Map<string, TaskGroup>()

  for (const task of tasks) {
    let key: string
    let label: string
    let color: string | null | undefined
    let icon: string | null | undefined
    let order: number

    switch (groupBy) {
      case 'project': {
        if (task.project) {
          key = task.project.id
          label = task.project.name
          color = task.project.color
        } else {
          key = NO_GROUP_KEY
          label = 'noProject'
        }
        order = task.project ? 0 : 999
        break
      }
      case 'area': {
        if (task.area) {
          key = task.area.id
          label = task.area.name
          color = task.area.color
          order = 0
        } else {
          key = NO_GROUP_KEY
          label = 'noArea'
          order = 999
        }
        break
      }
      case 'context': {
        if (task.context) {
          key = task.context.id
          label = task.context.name
          color = task.context.color
          icon = task.context.icon
        } else {
          key = NO_GROUP_KEY
          label = 'noContext'
        }
        order = task.context ? 0 : 999
        break
      }
      case 'due_date': {
        const bucket = getDueDateBucket(task.due_date)
        key = bucket.key
        label = bucket.key
        order = bucket.order
        break
      }
      case 'gtd_status': {
        key = task.gtd_status
        label = task.gtd_status
        order = GTD_STATUS_ORDER[task.gtd_status] ?? 99
        break
      }
    }

    const existing = groupMap.get(key)
    if (existing) {
      existing.tasks.push(task)
    } else {
      groupMap.set(key, { key, label, color, icon, order, tasks: [task] })
    }
  }

  const groups = Array.from(groupMap.values())

  groups.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order
    return a.label.localeCompare(b.label)
  })

  return groups
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/utils/groupTasks.ts
git commit -m "feat: add groupTasks utility for visual task grouping"
```

---

## Task 4: Update useTaskFilter to persist group_by

**Files:**
- Modify: `frontend/src/hooks/useTaskFilter.ts`

- [ ] **Step 1: Add group_by to StoredFilters**

In `frontend/src/hooks/useTaskFilter.ts`, update the `StoredFilters` interface (lines 5-14) to add `group_by`:

```typescript
interface StoredFilters {
  context_id?: string
  area_id?: string
  tag_id?: string
  is_completed?: boolean
  due_date_from?: string
  due_date_to?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  group_by?: string
}
```

- [ ] **Step 2: Exclude group_by from generic persistence exclusion**

In the `saveFilters` function (line 41), the existing code excludes `gtd_status` and `project_id` from persistence. `group_by` should be persisted — no changes needed there since it's not in the exclusion list.

- [ ] **Step 3: Update hasActiveFilters to include group_by**

In the `hasActiveFilters` memo (around line 116), add a check for `group_by`:

After the `hasSort` variable, add:

```typescript
    const hasGroupBy = !!filters.group_by
    return !!(hasNonDefault || hasSort || hasGroupBy)
```

Replace the existing return statement `return !!(hasNonDefault || hasSort)` with the above.

- [ ] **Step 4: Update activeFilterCount to include group_by**

In the `activeFilterCount` memo (around line 133), add:

```typescript
    if (filters.group_by) count++
```

Add this line after the `due_date_to` check (line 145) and before the `return count`.

- [ ] **Step 5: Verify compilation**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add frontend/src/hooks/useTaskFilter.ts
git commit -m "feat: persist group_by filter in localStorage via useTaskFilter"
```

---

## Task 5: Create TaskGroupSection component

**Files:**
- Create: `frontend/src/components/TaskGroupSection.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/TaskGroupSection.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify compilation**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/TaskGroupSection.tsx
git commit -m "feat: add TaskGroupSection component with collapsible headers"
```

---

## Task 6: Update TaskFilterPanel — add group-by dropdown + sort options

**Files:**
- Modify: `frontend/src/components/TaskFilterPanel.tsx`

- [ ] **Step 1: Add import for GroupBy type**

At the top of `TaskFilterPanel.tsx`, update the import from useTasks (line 3) to include `GroupBy`:

```typescript
import type { TaskFilters as TaskFiltersType, GtdStatus, GroupBy } from '../hooks/useTasks'
```

- [ ] **Step 2: Add GROUP_BY_OPTIONS constant**

After the `SORT_OPTIONS` array (line 74), add:

```typescript
  const GROUP_BY_OPTIONS: { value: GroupBy; labelKey: string }[] = [
    { value: 'project', labelKey: 'groupProject' },
    { value: 'area', labelKey: 'groupArea' },
    { value: 'context', labelKey: 'groupContext' },
    { value: 'due_date', labelKey: 'groupDueDate' },
    { value: 'gtd_status', labelKey: 'groupGtdStatus' },
  ]
```

- [ ] **Step 3: Add new sort options**

Update the `SORT_OPTIONS` array (lines 69-74) to include `updated_at` and `completed_at`:

```typescript
  const SORT_OPTIONS = [
    { value: 'created_at', labelKey: 'sortCreated' },
    { value: 'title', labelKey: 'sortName' },
    { value: 'due_date', labelKey: 'sortDeadline' },
    { value: 'updated_at', labelKey: 'sortUpdated' },
    { value: 'completed_at', labelKey: 'sortCompletedAt' },
    { value: 'position', labelKey: 'sortPosition' },
  ]
```

- [ ] **Step 4: Add group-by dropdown to the toolbar row**

In the search-open toolbar section (after the sort order toggle button, around line 162), add the group-by dropdown. Insert this code right after the sort direction button's closing `</button>` and before the closing `</div>` of the flex container:

```tsx
            <select
              value={filters.group_by || ''}
              onChange={(e) => onUpdateFilter('group_by', (e.target.value || undefined) as GroupBy | undefined)}
              className="px-2 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">{t('groupNone')}</option>
              {GROUP_BY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
```

- [ ] **Step 5: Verify compilation**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/TaskFilterPanel.tsx
git commit -m "feat: add group-by dropdown and new sort options to TaskFilterPanel"
```

---

## Task 7: Update TaskListView — conditional grouped rendering

**Files:**
- Modify: `frontend/src/components/TaskListView.tsx`

- [ ] **Step 1: Add imports**

At the top of `TaskListView.tsx`, add these imports after the existing imports:

```typescript
import { groupTasks } from '../utils/groupTasks'
import { TaskGroupSection } from './TaskGroupSection'
```

- [ ] **Step 2: Add groupBy prop to TaskListViewProps**

Update `TaskListViewProps` interface (line 37) to add:

```typescript
  groupBy?: import('../hooks/useTasks').GroupBy
```

Add this after the `showGtdStatus?: boolean` prop (line 58).

- [ ] **Step 3: Destructure groupBy prop**

In the component function (line 177), add `groupBy` to the destructured props:

```typescript
  groupBy,
```

Add it after `showGtdStatus = false,` (line 194).

- [ ] **Step 4: Add grouping logic**

After the `activeTasks`/`completedTasks` definitions (around line 301), add the grouping computation:

```typescript
  const activeGroups = groupBy ? groupTasks(activeTasks, groupBy) : null
```

- [ ] **Step 5: Replace active tasks rendering with conditional grouped/flat**

Replace the existing active tasks rendering block (lines 440-576). The entire `{activeTasks.length > 0 && (...)}` block should become:

```tsx
      {activeTasks.length > 0 && !activeGroups && (
        <div className="space-y-2">
          {activeTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4 hover:shadow-md dark:hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setViewingTaskId(task.id)}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => onToggleTask(task.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1 h-4 w-4 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium relative text-gray-900 dark:text-gray-100">
                    <span className="inline-flex items-center">
                      <HighlightText text={task.title} query={searchQuery} />
                      <TaskIcons task={task} onHistoryClick={() => setHistoryTaskId(task.id)} />
                    </span>
                    {historyTaskId === task.id && (
                      <RecurrenceHistoryPopup taskId={task.id} onClose={() => setHistoryTaskId(null)} />
                    )}
                  </h3>
                  {task.description && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      <HighlightText text={task.description} query={searchQuery} />
                    </p>
                  )}
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {task.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white"
                          style={{ backgroundColor: tag.color || '#6366f1' }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {task.project && (
                    <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                      <Link
                        to={`/projects/${task.project.id}`}
                        className="inline-flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline"
                      >
                        {task.project.color && (
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: task.project.color }} />
                        )}
                        <span>{task.project.name}</span>
                      </Link>
                    </div>
                  )}
                  {task.context && (
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-600 dark:text-gray-400">
                        {task.context.color && (
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: task.context.color }} />
                        )}
                        <span>{task.context.name}</span>
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {showGtdStatus && task.gtd_status && (() => {
                      const cfg = GTD_STATUS_CONFIG[task.gtd_status]
                      return cfg ? (
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>
                          {t(cfg.labelKey)}
                        </span>
                      ) : null
                    })()}
                    {(() => {
                      const result = formatDueDate(task.due_date, locale)
                      const isOverdue = result.overdue
                      const dueText = !task.due_date
                        ? t('noDueDate')
                        : result.isPlain
                          ? result.text + (result.time ? `, ${result.time}` : '')
                          : t(result.text, { date: result.date, count: result.count }) + (result.time ? `, ${result.time}` : '')
                      return (
                        <p className={`text-xs ${isOverdue ? 'text-red-500 dark:text-red-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
                          {dueText}
                        </p>
                      )
                    })()}
                    {task.checklist_total > 0 && (
                      <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium">
                        {task.checklist_completed}/{task.checklist_total}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                  {!hideMoveButtons &&
                    effectiveMoveTargets
                      .filter((mt) => mt.status !== task.gtd_status)
                      .map((mt) => (
                        <button
                          key={mt.status}
                          onClick={() => onMoveTask(task.id, mt.status)}
                          className="text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none"
                          title={t('moveTo', { label: mt.label })}
                        >
                          {mt.label}
                        </button>
                      ))}
                  {onRestoreTask && (
                    <button
                      onClick={() => onRestoreTask(task.id)}
                      className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 focus:outline-none font-medium"
                    >
                      {t('restore')}
                    </button>
                  )}
                  <button
                    onClick={() => setEditingTask(task)}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
                  >
                    {t('editBtn')}
                  </button>
                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 focus:outline-none"
                  >
                    {t('deleteBtn')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeGroups && activeGroups.length > 0 && (
        <div className="space-y-4">
          {activeGroups.map((group) => (
            <TaskGroupSection
              key={group.key}
              group={group}
              storageKey={`group-collapsed:${group.key}:${groupBy}`}
            >
              {group.tasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4 hover:shadow-md dark:hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setViewingTaskId(task.id)}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => onToggleTask(task.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 h-4 w-4 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium relative text-gray-900 dark:text-gray-100">
                        <span className="inline-flex items-center">
                          <HighlightText text={task.title} query={searchQuery} />
                          <TaskIcons task={task} onHistoryClick={() => setHistoryTaskId(task.id)} />
                        </span>
                        {historyTaskId === task.id && (
                          <RecurrenceHistoryPopup taskId={task.id} onClose={() => setHistoryTaskId(null)} />
                        )}
                      </h3>
                      {task.description && (
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          <HighlightText text={task.description} query={searchQuery} />
                        </p>
                      )}
                      {task.tags && task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {task.tags.map((tag) => (
                            <span
                              key={tag.id}
                              className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white"
                              style={{ backgroundColor: tag.color || '#6366f1' }}
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {(() => {
                          const result = formatDueDate(task.due_date, locale)
                          const isOverdue = result.overdue
                          const dueText = !task.due_date
                            ? t('noDueDate')
                            : result.isPlain
                              ? result.text + (result.time ? `, ${result.time}` : '')
                              : t(result.text, { date: result.date, count: result.count }) + (result.time ? `, ${result.time}` : '')
                          return (
                            <p className={`text-xs ${isOverdue ? 'text-red-500 dark:text-red-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
                              {dueText}
                            </p>
                          )
                        })()}
                        {task.checklist_total > 0 && (
                          <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium">
                            {task.checklist_completed}/{task.checklist_total}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                      {!hideMoveButtons &&
                        effectiveMoveTargets
                          .filter((mt) => mt.status !== task.gtd_status)
                          .map((mt) => (
                            <button
                              key={mt.status}
                              onClick={() => onMoveTask(task.id, mt.status)}
                              className="text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none"
                              title={t('moveTo', { label: mt.label })}
                            >
                              {mt.label}
                            </button>
                          ))}
                      {onRestoreTask && (
                        <button
                          onClick={() => onRestoreTask(task.id)}
                          className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 focus:outline-none font-medium"
                        >
                          {t('restore')}
                        </button>
                      )}
                      <button
                        onClick={() => setEditingTask(task)}
                        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
                      >
                        {t('editBtn')}
                      </button>
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 focus:outline-none"
                      >
                        {t('deleteBtn')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </TaskGroupSection>
          ))}
        </div>
      )}
```

Note: the grouped task cards omit project/context badges (redundant — they're in the section header) but keep due date, tags, and checklist.

- [ ] **Step 6: Verify compilation**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/TaskListView.tsx
git commit -m "feat: add conditional grouped rendering to TaskListView"
```

---

## Task 8: Pass groupBy from route pages to TaskListView

**Files:**
- Modify: `frontend/src/routes/GtdTaskList.tsx`
- Modify: `frontend/src/routes/ProjectDetail.tsx`
- Modify: `frontend/src/routes/AreaDetail.tsx`
- Modify: `frontend/src/routes/Tasks.tsx`

- [ ] **Step 1: Update GtdTaskList.tsx**

In `GtdTaskList.tsx`, pass `groupBy` from filters to `TaskListView`:

```tsx
      <TaskListView
        tasks={tasks}
        isLoading={isLoading}
        error={error}
        searchQuery={filters.search}
        onAddTask={handleAddTask}
        showAddForm={gtdStatus !== 'completed' && gtdStatus !== 'trash'}
        defaultGtdStatus={gtdStatus}
        onToggleTask={toggleTask}
        onDeleteTask={handleDeleteTask}
        onMoveTask={handleMoveTask}
        onRestoreTask={gtdStatus === 'trash' ? handleRestoreTask : undefined}
        onSaveTask={handleSaveTask}
        onRefetch={refetch}
        emptyMessage={t('noTasks')}
        autoFocus={gtdStatus === 'inbox'}
        groupBy={filters.group_by}
      />
```

- [ ] **Step 2: Update ProjectDetail.tsx**

Read `frontend/src/routes/ProjectDetail.tsx` and find the `TaskListView` usage. Add `groupBy={filters.group_by}` to its props.

- [ ] **Step 3: Update AreaDetail.tsx**

Read `frontend/src/routes/AreaDetail.tsx` and find the `TaskListView` usage. Add `groupBy={filters.group_by}` to its props.

- [ ] **Step 4: Update Tasks.tsx**

Read `frontend/src/routes/Tasks.tsx` and find the `TaskListView` usage. Add `groupBy={filters.group_by}` to its props.

- [ ] **Step 5: Verify compilation**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add frontend/src/routes/GtdTaskList.tsx frontend/src/routes/ProjectDetail.tsx frontend/src/routes/AreaDetail.tsx frontend/src/routes/Tasks.tsx
git commit -m "feat: pass groupBy from filters to TaskListView in all route pages"
```

---

## Task 9: Update docs/features.md

**Files:**
- Modify: `docs/features.md`

- [ ] **Step 1: Add grouping feature entry**

Read `docs/features.md` and add a new entry for the grouping feature in the appropriate category. Follow the existing format in the file.

Add this to the task management section:

```markdown
### Группировка задач
- Визуальная группировка задач по: проекту, области, контексту, дедлайну, GTD-статусу
- Сворачиваемые секции с заголовками, счётчиком задач и цветом/иконкой
- Состояние свёрнутости секций сохраняется в localStorage
- Сортировка по дате обновления и дате выполнения
- Доступно на всех страницах с панелью фильтров
```

- [ ] **Step 2: Commit**

```bash
git add docs/features.md
git commit -m "docs: add task grouping feature to features.md"
```

---

## Task 10: Lint and final verification

- [ ] **Step 1: Run frontend lint**

Run: `cd frontend && npm run lint`
Expected: no errors (or only pre-existing warnings)

- [ ] **Step 2: Run typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Run frontend tests**

Run: `cd frontend && npm test`
Expected: all tests pass

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address lint/type/test issues from grouping feature"
```
