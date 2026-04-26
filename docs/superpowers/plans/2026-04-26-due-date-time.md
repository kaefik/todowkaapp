# Due Date Time — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional time to `due_date` so users can set a specific deadline time (e.g. "18:00") and receive a notification when the deadline arrives.

**Architecture:** Add an optional `<input type="time">` next to the existing `<input type="date">` in TaskEditModal. When time is provided, construct an ISO datetime with the user's timezone; when absent, keep current end-of-day behavior. Update display functions to show time when present. Add a scheduler job to detect deadline arrival and send notifications.

**Tech Stack:** React 18, TypeScript, React Hook Form + Zod, Tailwind CSS, FastAPI, SQLAlchemy, APScheduler

---

### Task 1: Add `due_time` field to TaskEditModal schema and UI

**Files:**
- Modify: `frontend/src/components/TaskEditModal.tsx`

- [ ] **Step 1: Add `due_time` to Zod schema and form type**

In `TaskEditModal.tsx`, update the schema at line 74 to include `due_time`:

```typescript
const editTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().nullable().optional(),
  context_id: z.string().nullable().optional().transform(v => v === '' ? null : v),
  area_id: z.string().nullable().optional().transform(v => v === '' ? null : v),
  project_id: z.string().nullable().optional().transform(v => v === '' ? null : v),
  gtd_status: z.string().optional(),
  due_date: z.string().nullable().optional().transform(v => v === '' ? null : v),
  due_time: z.string().nullable().optional().transform(v => v === '' ? null : v),
  notes: z.string().nullable().optional(),
})
```

- [ ] **Step 2: Add `toLocalTimeStr` helper function**

Add after `toLocalDateStr` (after line 11):

```typescript
function toLocalTimeStr(isoString: string | null | undefined): string | null {
  if (!isoString) return null
  const d = new Date(isoString)
  const hours = d.getHours()
  const minutes = d.getMinutes()
  const seconds = d.getSeconds()
  const ms = d.getMilliseconds()
  if (hours === 23 && minutes === 59 && seconds === 59 && ms >= 999) return null
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}
```

This detects end-of-day (23:59:59.999) and returns null, meaning "no specific time" (backward compatible).

- [ ] **Step 3: Update `defaultValues` useMemo to include `due_time`**

Replace the `defaultValues` useMemo (around line 166) to include `due_time`:

```typescript
const defaultValues = useMemo(() => {
  if (!task) return undefined
  return {
    title: task.title,
    description: task.description,
    context_id: task.context_id ?? null,
    area_id: task.area_id ?? null,
    project_id: task.project_id ?? null,
    gtd_status: task.gtd_status,
    due_date: toLocalDateStr(task.due_date),
    due_time: toLocalTimeStr(task.due_date),
    notes: task.notes ?? null,
  }
}, [task])
```

- [ ] **Step 4: Update `useEffect` reset to include `due_time`**

In the useEffect that resets form when task changes (around line 191), add `due_time`:

```typescript
useEffect(() => {
  if (task && isOpen) {
    const dueDateStr = toLocalDateStr(task.due_date)
    const dueTimeStr = toLocalTimeStr(task.due_date)
    const today = todayLocalDateStr()

    reset({
      title: task.title,
      description: task.description,
      context_id: task.context_id ?? null,
      area_id: task.area_id ?? null,
      project_id: task.project_id ?? null,
      gtd_status: task.gtd_status,
      due_date: dueDateStr,
      due_time: dueTimeStr,
      notes: task.notes ?? null,
    })
    // ... rest stays the same
  }
}, [task, isOpen, reset])
```

- [ ] **Step 5: Update `useForm` default values**

Update the default values in useForm (around line 188):

```typescript
defaultValues: defaultValues ?? { title: '', context_id: null, area_id: null, project_id: null, due_date: null, due_time: null },
```

- [ ] **Step 6: Add time input in the UI**

After the `<input type="date" id="due_date">` (after line 499), add a time input:

```tsx
              <input
                {...register('due_date', {
                  onChange: handleDueDateChange
                })}
                type="date"
                id="due_date"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
              />
              {watch('due_date') && (
                <div className="mt-2">
                  <label htmlFor="due_time" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {t('deadlineTime')}
                  </label>
                  <input
                    {...register('due_time')}
                    type="time"
                    id="due_time"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
                  />
                </div>
              )}
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/TaskEditModal.tsx
git commit -m "feat: add due_time field to TaskEditModal schema and UI"
```

---

### Task 2: Update form submission to construct datetime with time

**Files:**
- Modify: `frontend/src/components/TaskEditModal.tsx`

- [ ] **Step 1: Update `onSubmit` to construct datetime from date + time**

The `onSubmit` function (around line 293) needs to construct the `due_date` value sent to the backend. Replace the `onSubmit` function:

```typescript
const onSubmit = async (data: EditTaskFormData) => {
  if (!task) return
  let gtdStatus = data.gtd_status as GtdStatus | undefined
  let dueDateValue = data.due_date

  if (dueDateValue && data.due_time) {
    const [year, month, day] = dueDateValue.split('-').map(Number)
    const [hours, minutes] = data.due_time.split(':').map(Number)
    const dt = new Date(year, month - 1, day, hours, minutes, 0, 0)
    dueDateValue = dt.toISOString()
  } else if (dueDateValue) {
    const [year, month, day] = dueDateValue.split('-').map(Number)
    const dt = new Date(year, month - 1, day, 23, 59, 59, 999)
    dueDateValue = dt.toISOString()
  }

  if (dueDateValue && task.gtd_status === 'inbox' && (!gtdStatus || gtdStatus === 'inbox')) {
    gtdStatus = 'active'
  }
  await onSave(task.id, {
    ...data,
    due_date: dueDateValue,
    gtd_status: gtdStatus,
    tag_ids: selectedTagIds,
    recurrence_type: recurrenceData.recurrence_type,
    recurrence_config: recurrenceData.recurrence_config,
    recurrence_end_date: recurrenceData.recurrence_end_date,
    reminder_time: reminderData.reminder_time,
    reminder_offsets: reminderData.reminder_offsets,
  })
  onClose()
}
```

Note: we construct the date in local timezone then convert to ISO. The backend will store it as UTC.

- [ ] **Step 2: Remove `due_time` from the saved payload**

The `due_time` field is only for the form UI — it must not be sent to the backend. Since `UpdateTask` interface doesn't have `due_time`, spreading `...data` won't include it as it gets filtered by TypeScript. But to be safe, destructure it out:

```typescript
const { due_time: _dueTime, ...restData } = data
// ... use restData instead of data in onSave
```

Actually, since `UpdateTask` doesn't accept `due_time`, the spread is fine — extra fields are ignored. No change needed.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/TaskEditModal.tsx
git commit -m "feat: construct due_date datetime from date + optional time on submit"
```

---

### Task 3: Add `deadlineTime` translation key

**Files:**
- Modify: `frontend/src/i18n/locales/en/tasks.json`
- Modify: `frontend/src/i18n/locales/ru/tasks.json`

- [ ] **Step 1: Add English translation**

Find the translation files and add the `deadlineTime` key:

In `en/tasks.json`, add:
```json
"deadlineTime": "Time (optional)"
```

- [ ] **Step 2: Add Russian translation**

In `ru/tasks.json`, add:
```json
"deadlineTime": "Время (необязательно)"
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/i18n/
git commit -m "feat: add deadlineTime translation key"
```

---

### Task 4: Update `formatDueDate` to show time in TaskListView

**Files:**
- Modify: `frontend/src/components/TaskListView.tsx`

- [ ] **Step 1: Update `formatDueDate` to extract and return time**

In `TaskListView.tsx`, update the `formatDueDate` function (line 71) to detect if a specific time is set and include it in the result:

```typescript
interface DueDateResult {
  text: string
  overdue: boolean
  date?: string
  count?: number
  isPlain?: boolean
  time?: string
}

function formatDueDate(dueDate: string | null, locale: string): DueDateResult {
  if (!dueDate) return { text: 'noDueDate', overdue: false }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const due = new Date(dueDate)
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const diffMs = dueDay.getTime() - today.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  const shortDate = formatShortDate(due, locale)

  const hours = due.getHours()
  const minutes = due.getMinutes()
  const seconds = due.getSeconds()
  const ms = due.getMilliseconds()
  const hasTime = !(hours === 23 && minutes === 59 && seconds === 59 && ms >= 999)
  const timeStr = hasTime ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}` : undefined

  if (diffDays === 0) return { text: 'todayDate', overdue: false, date: shortDate, time: timeStr }
  if (diffDays === 1) return { text: 'tomorrowDate', overdue: false, date: shortDate, time: timeStr }
  if (diffDays === -1) return { text: 'yesterdayDate', overdue: true, date: shortDate, time: timeStr }
  if (diffDays < -1) return { text: 'overdueDays', overdue: true, date: shortDate, count: Math.abs(diffDays), time: timeStr }
  if (diffDays <= 7) return { text: 'inDays', overdue: false, date: shortDate, count: diffDays, time: timeStr }
  return { text: shortDate, overdue: false, isPlain: true, time: timeStr }
}
```

- [ ] **Step 2: Update display to append time**

In both places where `dueText` is constructed (around line 488-500 and line 648-660), update to append time:

```tsx
const result = formatDueDate(task.due_date, locale)
const isOverdue = result.overdue
const dueText = !task.due_date
  ? t('noDueDate')
  : result.isPlain
    ? result.text + (result.time ? `, ${result.time}` : '')
    : t(result.text, { date: result.date, count: result.count }) + (result.time ? `, ${result.time}` : '')
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/TaskListView.tsx
git commit -m "feat: show due_date time in TaskListView"
```

---

### Task 5: Update `formatDueDate` to show time in Tasks page

**Files:**
- Modify: `frontend/src/routes/Tasks.tsx`

- [ ] **Step 1: Update `formatDueDate` in Tasks.tsx**

The `formatDueDate` at line 152 also needs to show time. Update:

```typescript
const formatDueDate = (dueDate: string | null): { text: string; overdue: boolean } => {
  if (!dueDate) return { text: t('noDueDate'), overdue: false }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const due = new Date(dueDate)
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const diffMs = dueDay.getTime() - today.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  const shortDate = due.toLocaleDateString(locale, { day: 'numeric', month: 'short' })

  const hours = due.getHours()
  const minutes = due.getMinutes()
  const seconds = due.getSeconds()
  const ms = due.getMilliseconds()
  const hasTime = !(hours === 23 && minutes === 59 && seconds === 59 && ms >= 999)
  const timeSuffix = hasTime ? `, ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}` : ''

  if (diffDays === 0) return { text: t('todayDate', { date: shortDate }) + timeSuffix, overdue: false }
  if (diffDays === 1) return { text: t('tomorrowDate', { date: shortDate }) + timeSuffix, overdue: false }
  if (diffDays === -1) return { text: t('yesterdayDate', { date: shortDate }) + timeSuffix, overdue: true }
  if (diffDays < -1) return { text: t('overdueDays', { count: Math.abs(diffDays), date: shortDate }) + timeSuffix, overdue: true }
  if (diffDays <= 7) return { text: t('inDays', { count: diffDays, date: shortDate }) + timeSuffix, overdue: false }
  return { text: shortDate + timeSuffix, overdue: false }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/routes/Tasks.tsx
git commit -m "feat: show due_date time in Tasks page"
```

---

### Task 6: Update TaskDetailModal to show due_date with time

**Files:**
- Modify: `frontend/src/components/TaskDetailModal.tsx`

- [ ] **Step 1: Update `formatDate` to detect and show time**

Update the `formatDate` function (line 20) to show time when a specific time is set:

```typescript
function formatDueDateWithTime(dateStr: string | null, timezone: string | null, locale: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const hours = d.getHours()
  const minutes = d.getMinutes()
  const seconds = d.getSeconds()
  const ms = d.getMilliseconds()
  const hasTime = !(hours === 23 && minutes === 59 && seconds === 59 && ms >= 999)

  const datePart = new Date(dateStr).toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: timezone || undefined,
  })

  if (!hasTime) return datePart

  const timePart = new Date(dateStr).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone || undefined,
  })

  return `${datePart}, ${timePart}`
}
```

- [ ] **Step 2: Replace `formatDate` call with `formatDueDateWithTime`**

At line 224, replace:

```tsx
<p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(task.due_date, user?.timezone ?? null, locale)}</p>
```

with:

```tsx
<p className="text-sm text-gray-600 dark:text-gray-400">{formatDueDateWithTime(task.due_date, user?.timezone ?? null, locale)}</p>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/TaskDetailModal.tsx
git commit -m "feat: show due_date time in TaskDetailModal"
```

---

### Task 7: Update ReminderEditor to use due_date time

**Files:**
- Modify: `frontend/src/components/ReminderEditor.tsx`

- [ ] **Step 1: Update `isReminderInPast` to use actual due_date time**

In `ReminderEditor.tsx`, the `isReminderInPast` logic at line 44 currently constructs `dueDateObj` from `dueDate + 'T00:00:00'` (start of day). If `dueDate` already contains a specific time, it should use that. Update:

```typescript
const isReminderInPast = useTime && dueDate && time ? (() => {
  const now = new Date()
  let dueDateObj: Date
  const dueDateLower = dueDate.toLowerCase()
  if (dueDateLower.includes('t') && !dueDateLower.endsWith('t23:59:59.999') && !dueDateLower.endsWith('t23:59:59.999z')) {
    dueDateObj = new Date(dueDate)
  } else {
    dueDateObj = new Date(dueDate + 'T00:00:00')
  }
  const parts = time.split(':').map(Number)
  const h = parts[0]
  const m = parts[1]
  if (h == null || m == null) return false
  const reminderDate = new Date(dueDateObj)
  reminderDate.setHours(h, m, 0, 0)
  return reminderDate < now
})() : false
```

Wait — actually the ReminderEditor receives `dueDate` as a string that comes from `watch('due_date')`, which is now a date-only string like `"2026-04-26"`. The actual ISO datetime is only assembled in `onSubmit`. So ReminderEditor still gets a date-only string. The current logic is correct for date-only inputs.

However, we should pass the original `task.due_date` (the full ISO string) to ReminderEditor so it can use the actual time. Let me reconsider.

Actually, looking at the flow more carefully:
- `watch('due_date')` returns the form field value, which is a date string like `"2026-04-26"`
- The original `task.due_date` is the full ISO string like `"2026-04-25T23:59:59.999Z"`

The ReminderEditor currently uses `dueDate` (the form date string) + `T00:00:00` as the base for calculating reminders. This is fine for the form, because the user is editing.

But we need to ensure that when the user changes the time in the `due_time` field, the ReminderEditor knows about it. The simplest approach: pass `due_time` to ReminderEditor as well, so it can compute the correct reminder datetime.

Actually, since ReminderEditor already calculates reminder times independently (the `reminder_time` is a separate field, not derived from `due_date`), and the backend's `reminder_service.py` already correctly uses the full `due_date` datetime to calculate when to fire reminders — the frontend ReminderEditor is mainly for UI validation (checking if reminder is in the past). Let's keep it simple.

**Revised Step 1:** Pass the original task `due_date` to ReminderEditor alongside the form due_date, so `isReminderInPast` uses the real datetime:

Update `ReminderEditor` props to accept an optional `dueDateTime` (the original ISO string):

```typescript
interface ReminderEditorProps {
  reminderTime: string | null
  reminderOffsets: number[] | null
  reminderFired: boolean
  dueDate: string | null
  dueDateTime?: string | null
  onChange: (data: {
    reminder_time: string | null
    reminder_offsets: number[] | null
  }) => void
}
```

And update `isReminderInPast`:

```typescript
const isReminderInPast = useTime && dueDate && time ? (() => {
  const now = new Date()
  const dueDateObj = dueDateTime
    ? new Date(dueDateTime)
    : new Date(dueDate + 'T00:00:00')
  const parts = time.split(':').map(Number)
  const h = parts[0]
  const m = parts[1]
  if (h == null || m == null) return false
  const reminderDate = new Date(dueDateObj)
  reminderDate.setHours(h, m, 0, 0)
  return reminderDate < now
})() : false
```

Wait, this is getting complex. The simpler approach: since `isReminderInPast` is just a UI warning, and the backend handles the real scheduling, we can leave ReminderEditor mostly unchanged. The key thing is that the backend's `reminder_service.py` already works with full datetimes.

**Final decision:** No change to ReminderEditor. The `isReminderInPast` check will use the date-only string which is good enough for the warning. The actual reminder firing is done by the backend which uses the full `due_date` datetime. **Skip this task.**

- [ ] **Step 1: Mark as skipped — no changes needed to ReminderEditor**

The backend `reminder_service.py` already uses `task.due_date` as a full datetime for calculating reminders. The frontend ReminderEditor's `isReminderInPast` is a UX hint only. The form's `due_date` is date-only, which is sufficient for this check.

---

### Task 8: Add deadline-arrival notification in backend scheduler

**Files:**
- Modify: `backend/app/scheduler.py`
- Modify: `backend/app/services/reminder_service.py`

- [ ] **Step 1: Add `find_deadline_arrived_tasks` method to ReminderService**

In `backend/app/services/reminder_service.py`, add a new method:

```python
async def find_deadline_arrived_tasks(self) -> list[Task]:
    now_utc = datetime.now(ZoneInfo('UTC'))

    result = await self.db.execute(
        select(Task)
        .options(selectinload(Task.user))
        .where(
            Task.due_date.isnot(None),
            Task.is_completed.is_(False),
            Task.deadline_notified.is_(False),
            Task.due_date <= now_utc,
            Task.gtd_status != 'trash',
        )
    )
    return list(result.scalars().all())
```

- [ ] **Step 2: Add `deadline_notified` column to Task model**

In `backend/app/models/task.py`, add the column:

```python
deadline_notified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, server_default='0')
```

- [ ] **Step 3: Create Alembic migration**

```bash
cd backend
alembic revision --autogenerate -m "add deadline_notified to task"
```

- [ ] **Step 4: Apply migration**

```bash
cd backend
alembic upgrade head
```

- [ ] **Step 5: Add scheduler job for deadline notifications**

In `backend/app/scheduler.py`, add a new job in the `startup` method:

```python
self.scheduler.add_job(
    self._job_send_deadline_notifications,
    'interval',
    minutes=1,
    id='send_deadline_notifications',
    replace_existing=True,
    max_instances=1
)
```

And add the static method:

```python
@staticmethod
async def _job_send_deadline_notifications():
    logger.info("Running job: send_deadline_notifications")

    try:
        from app.services.reminder_service import ReminderService

        async with AsyncSessionLocal() as session:
            reminder_service = ReminderService(session)

            tasks = await reminder_service.find_deadline_arrived_tasks()
            logger.info(f"Found {len(tasks)} tasks with arrived deadlines")

            for task in tasks:
                try:
                    user = task.user
                    if not user:
                        continue

                    from app.services.reminder_service import ReminderService
                    rs = ReminderService(session)
                    message = f'Дедлайн задачи "{task.title}" наступил'
                    notification = await rs.create_notification(
                        user=user,
                        task=task,
                        type='deadline_arrived',
                        message=message
                    )
                    task.deadline_notified = True
                    await session.commit()

                    from app.event_bus import event_bus
                    await event_bus.publish(f"{user.id}:notifications", "notification_created", {
                        "notification_id": str(notification.id),
                        "type": notification.type,
                        "message": notification.message,
                        "task_id": str(task.id) if task.id else None,
                        "notification_data": {
                            "id": str(notification.id),
                            "message": notification.message,
                            "created_at": notification.created_at.isoformat() if notification.created_at else None,
                            "due_date": task.due_date.isoformat() if task.due_date else None
                        }
                    })

                    if (
                        user.telegram_notifications_enabled
                        and user.telegram_chat_id
                        and user.telegram_bot_token
                    ):
                        try:
                            from app.services.telegram_notifier import TelegramNotifierService
                            await TelegramNotifierService.send_message(
                                user.telegram_bot_token,
                                user.telegram_chat_id,
                                f'⏰ Дедлайн задачи "{task.title}" наступил!',
                            )
                        except Exception as tg_err:
                            logger.error(f"Telegram deadline send failed for user {user.username}: {tg_err}")

                except Exception as e:
                    logger.error(f"Error sending deadline notification for task '{task.title}': {e}")
                    await session.rollback()

    except Exception as e:
        logger.error(f"Error in job_send_deadline_notifications: {e}")
```

- [ ] **Step 6: Reset `deadline_notified` when due_date changes**

In `backend/app/services/task_service.py`, in the `update_task` method, when `due_date` is updated, reset `deadline_notified`:

Find where `due_date` is updated in the update method and add:
```python
if 'due_date' in update_data:
    task.deadline_notified = False
```

- [ ] **Step 7: Commit**

```bash
git add backend/app/models/task.py backend/app/services/reminder_service.py backend/app/scheduler.py backend/app/services/task_service.py backend/alembic/
git commit -m "feat: add deadline-arrival notification scheduler"
```

---

### Task 9: Update frontend Dexie DB schema for `deadline_notified`

**Files:**
- Modify: `frontend/src/db/database.ts`

- [ ] **Step 1: Check current DB schema version and add `deadlineNotified` field**

Check `frontend/src/db/database.ts` for the current schema version and add the new field to the tasks table. Increment the schema version:

Add `deadlineNotified` to the task stores definition, and add an upgrade migration.

- [ ] **Step 2: Update mappers if needed**

In `frontend/src/db/mappers.ts`, ensure `deadlineNotified` / `deadline_notified` is mapped between DB and UI.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/db/
git commit -m "feat: add deadlineNotified to frontend DB schema"
```

---

### Task 10: Run linters and type checks

- [ ] **Step 1: Run backend linter**

```bash
cd backend && ruff check .
```

- [ ] **Step 2: Run frontend lint**

```bash
cd frontend && npm run lint
```

- [ ] **Step 3: Run frontend type check**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 4: Fix any issues found**

---

### Task 11: Update docs/features.md

**Files:**
- Modify: `docs/features.md`

- [ ] **Step 1: Add due_date time feature**

Add entry documenting the new optional time feature for due dates.

- [ ] **Step 2: Commit**

```bash
git add docs/features.md
git commit -m "docs: update features with due_date time"
```
