# Due Date Time — Design Spec

## Problem

Currently `due_date` stores only a date (end of day 23:59:59.999). Users cannot specify a specific deadline time like "submit report by 18:00". The ReminderEditor allows setting reminder times, but the actual deadline has no time component.

## Goal

Allow users to optionally set a specific time for `due_date`. When the deadline time arrives, an automatic notification fires: "Deadline for task X has arrived".

## Approach: Optional Time Input (Approach A)

Add an optional `<input type="time">` next to the existing `<input type="date">` in TaskEditModal. If time is not specified, behavior remains unchanged (end of day).

## Design

### 1. Model & API

**Backend:** No migration needed. `due_date` is already `DateTime(timezone=True)` in SQLAlchemy.

**Behavior change:**
- No time specified: `due_date = YYYY-MM-DDT23:59:59.999Z` (end of day, as now)
- Time specified: `due_date = YYYY-MM-DDTHH:MM:00.000` converted to UTC using user's timezone

### 2. Frontend — TaskEditModal

**UI changes in TaskEditModal:**
- After the `<input type="date" id="due_date">` add `<input type="time">` (visible only when date is selected)
- Time is optional. Empty = end of day (current behavior)
- "Today" checkbox sets only date, time remains empty

**Zod schema:** Add `due_time: z.string().nullable().optional()`

**Submission logic:**
- `due_time` specified: construct ISO datetime using user's timezone
- `due_time` not specified: use `getDayBounds().end` as before

### 3. Display

**TaskDetailModal:** If `due_date` has a specific time (not 23:59:59), show date + time, e.g. "26 April, 15:00"

**TaskListView / Tasks:** In due date text, append time when specific, e.g. "Today, 15:00" instead of just "Today"

### 4. Automatic Deadline Notification

When scheduler processes tasks with `due_date` that has a specific time and that time has arrived:
- Create notification: "Deadline for task X has arrived"
- Only fires once per task (track via existing `reminder_fired` or a new flag)

### 5. Impact on Existing Logic

**ReminderEditor:**
- `reminder_time` mode: currently anchors to `due_date + T00:00:00`. Must anchor to specific due_date time when present
- `reminder_offsets` mode: already works correctly (subtracts from due_date datetime)

**getDayBounds / Today / Tomorrow pages:**
- Filtering by full days unaffected. Task with `due_date = 2026-04-26T15:00:00` still appears on April 26
- `>= start && <= end` comparison continues to work

**RecurrenceEditor:**
- Recurring tasks copy the time component — works because backend already uses datetime

### 6. Files to Modify

**Frontend:**
- `src/components/TaskEditModal.tsx` — add time input, update schema, update submission
- `src/components/TaskDetailModal.tsx` — show time in deadline display
- `src/components/TaskListView.tsx` — show time in due date label
- `src/routes/Tasks.tsx` — show time in due date label
- `src/components/ReminderEditor.tsx` — anchor reminder_time to specific due_date time

**Backend:**
- `app/scheduler.py` — add deadline-arrival notification logic
- `app/services/reminder_service.py` — possibly add deadline notification method

**Tests:**
- Update existing tests for new time behavior
- Add tests for deadline-arrival notification
