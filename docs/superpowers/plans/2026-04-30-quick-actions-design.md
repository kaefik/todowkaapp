# Quick Actions (Long-Press) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить меню быстрых действий при долгом нажатии (mobile) и контекстном меню (desktop) на задачи в списке

**Architecture:** Custom hook `useLongPress` для dete ction долгого нажатия, компонент `TaskQuickActions` для popover меню, интеграция в `TaskListView.tsx`

**Tech Stack:** React hooks, CSS animations, Tailwind

---

### Task 1: Create useLongPress hook

**Files:**
- Create: `frontend/src/hooks/useLongPress.ts`

- [ ] **Step 1: Write hook implementation**

```typescript
import { useState, useCallback, useRef } from 'react'

interface UseLongPressOptions {
  onLongPress: () => void
  delay?: number
  threshold?: number
}

export function useLongPress({ onLongPress, delay = 400, threshold = 10 }: UseLongPressOptions) {
  const [isLongPressing, setIsLongPressing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null(null)
  const startPosRef = useRef<{ x: number; y: number } | null>(null)

  const start = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const pos = 'touches' in e ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY }
    startPosRef.current = pos
    setIsLongPressing(false)
    
    timerRef.current = setTimeout(() => {
      setIsLongPressing(true)
      if (navigator.vibrate) navigator.vibrate(10)
      onLongPress()
    }, delay)
  }, [onLongPress, delay])

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setIsLongPressing(false)
  }, [])

  const move = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!startPosRef.current || timerRef.current === null) return
    
    const pos = 'touches' in e ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY }
    const dx = Math.abs(pos.x - startPosRef.current.x)
    const dy = Math.abs(pos.y - startPosRef.current.y)
    
    if (dx > threshold || dy > threshold) {
      cancel()
    }
  }, [cancel, threshold])

  return {
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchMove: move,
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onMouseMove: move,
    isLongPressing,
  }
}
```

- [ ] **Step 2: Write simple test mentally (no code needed)**

Check: signature matches hooks pattern in codebase (like useDebounce)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useLongPress.ts
git commit -m "feat: add useLongPress hook for quick actions detection"
```

---

### Task 2: Create TaskQuickActions component

**Files:**
- Create: `frontend/src/components/TaskQuickActions.tsx`
- Dependencies: SortGroupPopover.tsx (reference for popup pattern)

- [ ] **Step 1: Create TaskQuickActions component**

```tsx
import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { Task } from '../hooks/useTasks'

interface TaskQuickActionsProps {
  task: Task
  onComplete: () => void
  onEdit: () => void
  onChangeDate: () => void
  onChangeProject: () => void
  onDelete: () => void
  onRestore?: () => void
  position: { x: number; y: number }
  isOpen: boolean
  onClose: () => void
}

const ACTION_ICONS: Record<string, string> = {
  complete: '✓',
  edit: '✏️',
  postpone: '📅',
  project: '📁',
  delete: '🗑️',
  restore: '↩️',
}

export function TaskQuickActions({
  task,
  onComplete,
  onEdit,
  onChangeDate,
  onChangeProject,
  onDelete,
  onRestore,
  position,
  isOpen,
  onClose,
}: TaskQuickActionsProps) {
  const { t } = useTranslation('tasks')
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const actions = [
    { icon: ACTION_ICONS.complete, label: task.completed ? t('restore') : t('statusCompleted'), onClick: onComplete, primary: true },
    { icon: ACTION_ICONS.edit, label: t('editBtn'), onClick: onEdit },
    { icon: ACTION_ICONS.postpone, label: t('postponeForTomorrow'), onClick: onChangeDate },
    { icon: ACTION_ICONS.project, label: t('changeProject'), onClick: onChangeProject },
    ...(onRestore ? [{ icon: ACTION_ICONS.restore, label: t('restore'), onClick: onRestore }] : []),
    { icon: ACTION_ICONS.delete, label: t('deleteBtn'), onClick: onDelete, danger: true },
  ]

  return (
    <div
      ref={popoverRef}
      className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-2 z-50 min-w-48 animate-scale-in"
      style={{
        left: Math.min(position.x, window.innerWidth - 200),
        top: Math.min(position.y, window.innerHeight - 300),
      }}
    >
      {task.due_date && (
        <div className="px-2 py-1 text-[10px] text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700 mb-1">
          {t('quickActionsDue', { date: new Date(task.due_date).toLocaleDateString() })}
        </div>
      )}
      {actions.map((action, index) => (
        <button
          key={index}
          type="button"
          onClick={() => {
            action.onClick()
            onClose()
          }}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            action.danger
              ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
              : action.primary
              ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <span className="text-base w-6 text-center">{action.icon}</span>
          <span className="flex-1 text-left">{action.label}</span>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Add i18n keys for new strings**

File: `frontend/src/i18n/locales/ru/tasks.json` — add:
```json
"postponeForTomorrow": "Отложить на завтра",
"changeProject": "Изменить проект",
"quickActionsDue": "Срок: {{date}}"
```

File: `frontend/src/i18n/locales/en/tasks.json` — add:
```json
"postponeForTomorrow": "Postpone to tomorrow",
"changeProject": "Change project",
"quickActionsDue": "Due: {{date}}"
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/TaskQuickActions.tsx frontend/src/i18n/locales/ru/tasks.json frontend/src/i18n/locales/en/tasks.json
git commit -m "feat: add TaskQuickActions component for long-press menu"
```

---

### Task 3: Integrate TaskQuickActions into TaskListView

**Files:**
- Modify: `frontend/src/components/TaskListView.tsx` (lines 463-596 for task cards)

- [ ] **Step 1: Add imports**

At top of file, add:
```typescript
import { useLongPress } from '../hooks/useLongPress'
import { TaskQuickActions } from './TaskQuickActions'
```

- [ ] **Step 2: Add state for quick actions**

After other useState in TaskListView component (~line 203):
```typescript
const [quickActionTask, setQuickActionTask] = useState<Task | null>(null)
const [quickActionPosition, setQuickActionPosition] = useState({ x: 0, y: 0 })
```

- [ ] **Step 3: Add handlers for actions**

Add before return statement:
```typescript
const handlePostponeToTomorrow = async (taskId: string) => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(23, 59, 59, 999)
  await onSaveTask(taskId, { due_date: tomorrow.toISOString() })
}

const handleQuickActionEdit = (task: Task) => {
  setQuickActionTask(null)
  setEditingTask(task)
}

const handleQuickActionDelete = async (taskId: string) => {
  setQuickActionTask(null)
  await onDeleteTask(taskId)
}

const handleQuickActionComplete = async (taskId: string) => {
  setQuickActionTask(null)
  await onToggleTask(taskId)
}

const handleQuickActionRestore = async (taskId: string) => {
  setQuickActionTask(null)
  if (onRestoreTask) {
    await onRestoreTask(taskId)
  }
}
```

- [ ] **Step 4: Add long-press and context-menu to task cards**

In task card div (around line 463), add props to div:
```typescript
// Find the div with key={task.id} around line 463-468 and add:
const longPress = useLongPress({
  onLongPress: () => {
    setQuickActionTask(task)
    setQuickActionPosition({ x: 200, y: 200 })
  },
})

const handleContextMenu = (e: React.MouseEvent) => {
  e.preventDefault()
  setQuickActionTask(task)
  setQuickActionPosition({ x: e.clientX, y: e.clientY })
}

// Add to the div:
onContextMenu={handleContextMenu}
onTouchStart={longPress.onTouchStart}
onTouchEnd={longPress.onTouchEnd}
onTouchMove={longPress.onTouchMove}
```

Do this for BOTH activeTasks.map and completedTasks.map sections.

- [ ] **Step 5: Add TaskQuickActions component**

Add before closing of main fragment (before final `</>` around line 896):
```tsx
<TaskQuickActions
  task={quickActionTask!}
  onComplete={() => quickActionTask && handleQuickActionComplete(quickActionTask.id)}
  onEdit={() => quickActionTask && handleQuickActionEdit(quickActionTask)}
  onChangeDate={() => quickActionTask && handlePostponeToTomorrow(quickActionTask.id)}
  onChangeProject={() => quickActionTask && handleQuickActionEdit(quickActionTask)}
  onDelete={() => quickActionTask && handleQuickActionDelete(quickActionTask.id)}
  onRestore={onRestoreTask ? () => quickActionTask && handleQuickActionRestore(quickActionTask.id) : undefined}
  position={quickActionPosition}
  isOpen={!!quickActionTask}
  onClose={() => setQuickActionTask(null)}
/>
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/TaskListView.tsx frontend/src/i18n/locales/ru/tasks.json frontend/src/i18n/locales/en/tasks.json
git commit -m "feat: integrate TaskQuickActions into TaskListView"
```

---

### Task 4: Add CSS animation

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Add scale-in animation**

Add to index.css:
```css
@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-scale-in {
  animation: scale-in 150ms ease-out forwards;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/index.css
git commit -m "feat: add scale-in animation for quick actions popover"
```

---

### Task 5: Test and verify

**Files:**
- Manual testing

- [ ] **Step 1: Start frontend and test**

```bash
cd frontend && npm run dev
```

- [ ] **Step 2: Verify mobile long-press**

- Go to any task list (e.g., /tasks)
- Press and hold on a task card for 400ms
- Verify popover appears with actions
- Verify haptic feedback (on mobile)

- [ ] **Step 3: Verify desktop right-click**

- Right-click on a task card
- Verify popover appears at cursor position

- [ ] **Step 4: Test each action**

- Complete: should toggle task status
- Edit: should open TaskEditModal
- Postpone: should add 1 day to due_date
- Delete: should delete task

- [ ] **Step 5: Commit**

```bash
git commit -m "test: verify all quick actions work correctly"
```

---

## Summary

| Task | Files | Status |
|------|-------|--------|
| 1 | `frontend/src/hooks/useLongPress.ts` | Created |
| 2 | `frontend/src/components/TaskQuickActions.tsx` | Created |
| 3 | `frontend/src/components/TaskListView.tsx` | Modified |
| 4 | `frontend/src/index.css` | Modified |
| 5 | Manual testing | Pending |

**Execution complete when:** All 5 tasks done, long-press works on mobile, context-menu works on desktop, all 5 actions execute correctly.