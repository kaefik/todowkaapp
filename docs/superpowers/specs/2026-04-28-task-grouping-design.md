# Task Grouping — Visual Grouping by Project, Area, Context, Due Date, GTD Status

**Date:** 2026-04-28
**Status:** Approved
**Approach:** Frontend-only (no backend changes)

## Problem

Tasks are displayed as a flat list with dropdown filters. Users need to visually organize tasks into collapsible sections grouped by project, area, context, due date, or GTD status, with sorting by date/time ascending and descending.

## Approach

All grouping logic runs client-side. Tasks are already stored in IndexedDB (Dexie) with loaded relations (project, context). Grouping is a visual transformation applied after existing sorting — no API changes needed.

## Grouping Types

### 1. By Project
- **Key:** `task.project_id` (null = "Без проекта")
- **Header:** Project name with color dot
- **Order:** Alphabetical, "Без проекта" last

### 2. By Area
- **Key:** `task.area_id` (null = "Без области")
- **Header:** Area name with color dot
- **Order:** Alphabetical, "Без области" last

### 3. By Context
- **Key:** `task.context_id` (null = "Без контекста")
- **Header:** Context name with icon
- **Order:** Alphabetical, "Без контекста" last

### 4. By Due Date
- **Buckets:** Overdue (due_date < today), Today, Tomorrow, Next 7 Days (due_date within next 7 days, excluding today/tomorrow), Later (beyond 7 days), No Deadline
- **Header:** Bucket label with count
- **Order:** Chronological (Overdue first, No Deadline last)
- **Calculation:** all dates compared against start of today in user's local timezone

### 5. By GTD Status
- **Key:** `task.gtd_status`
- **Header:** GTD status label (localized)
- **Order:** inbox → active → next → waiting → someday → completed

## Components

### TaskFilterPanel Changes
- Add "Группировать по" dropdown with options: None, Project, Area, Context, Due Date, GTD Status
- Default: None (flat list)
- Selection persisted in localStorage via useTaskFilter
- Add `updated_at` and `completed_at` to sort_by dropdown options

### TaskGroupSection (new component)
- Renders a section header: icon/color + group label + task count + collapse toggle (chevron)
- Collapsed state persisted in localStorage: `group-collapsed:{page}:{groupKey}`
- Renders child tasks below header when expanded

### TaskListView Changes
- When `group_by` is set: after sorting, pass tasks through `groupTasks()` utility
- Render `TaskGroupSection[]` instead of flat task cards
- Add task form remains above all groups
- Completed tasks section remains at bottom (below all groups)

## Logic

### `groupTasks(tasks, groupBy)` utility
- Pure TypeScript function
- Input: sorted Task[] and GroupBy type
- Output: `TaskGroup[]` — array of `{ key, label, color?, icon?, tasks: Task[] }`
- For project/area/context: reads `task.project`, `task.area`, `task.context` for label/color/icon
- For due date: computes bucket from `task.due_date` relative to current date
- For GTD status: maps `task.gtd_status` to localized label

### useTaskFilter Changes
- Add `group_by` field to filter state
- Persist in localStorage alongside existing filter persistence
- Group-by selector is independent of other filters

### Sorting
- Existing sort (sort_by + sort_order asc/desc) applies first
- Grouping applies after sorting — task order within groups is determined by sort
- No new sort logic needed

## Backend Changes

None. All task data with relations is already available in IndexedDB.

## Files to Modify

- `frontend/src/hooks/useTaskFilter.ts` — add `group_by` to filter state + localStorage
- `frontend/src/components/TaskFilterPanel.tsx` — add group-by dropdown + new sort options
- `frontend/src/components/TaskListView.tsx` — conditional group rendering
- `frontend/src/components/TaskGroupSection.tsx` — new component
- `frontend/src/utils/groupTasks.ts` — new utility function

## Edge Cases

- Tasks with no project/area/context → grouped into "Без ..." section (always last)
- Due date grouping: "Overdue" bucket for tasks with `due_date < now()`
- Empty groups: hidden (don't show sections with 0 tasks)
- Drag-and-drop reorder: only available in flat list mode (group_by = none), or within same group when grouped by position sort
- Mobile: same behavior, section headers are tappable for collapse/expand
