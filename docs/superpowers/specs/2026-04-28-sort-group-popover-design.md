# Sort & Group Popover — Chip-based Popover Control

**Date:** 2026-04-28
**Status:** Approved
**Approach:** Frontend-only (no backend changes)

## Problem

Current sorting and grouping controls are buried inside the expandable TaskFilterPanel. They use plain HTML `<select>` dropdowns which are hard to use on mobile and don't show the current state at a glance. Need a dedicated, compact, visually clear control.

## Design

A single icon button (⚡) triggers a popover with chip-based selection for grouping, sorting, and direction. Replaces the `sort_by`, `sort_order`, and `group_by` controls currently in TaskFilterPanel.

### Trigger Button

- Icon button placed next to the search/filter area in TaskListView
- Shows a small badge (dot) when non-default sorting/grouping is active
- Tooltip: "Вид списка" (localized)

### Popover Content

Three labeled sections, each with chip/pill buttons:

**1. Группировка**
Chips: Нет | Проект | Область | Контекст | Дедлайн | Статус
- Selected chip: indigo background (#e0e7ff), indigo text, indigo border
- Default: "Нет" (no grouping)
- Single select

**2. Сортировка**
Chips: 📅 Дата | Aa Название | 🕐 Создание | ✏️ Обновление | ✅ Завершение | 📌 Позиция
- Selected chip: indigo highlight
- Default: "📅 Дата" (sort by due_date)
- Single select

**3. Направление**
Chips: ↓ Убывание | ↑ Возрастание
- Default: ↓ Убывание
- Single select

### Behavior

- Global sorting — applies to all groups uniformly
- Selected state persisted in localStorage (via existing useTaskFilter persistence)
- Popover closes on outside click
- Chips wrap to next line on narrow screens (flex-wrap)
- Clicking a chip immediately applies the change (no "Apply" button)

## What Changes

### Removed from TaskFilterPanel
- `sort_by` `<select>` dropdown
- `sort_order` toggle button (↑/↓)
- `group_by` `<select>` dropdown
- Corresponding `SORT_OPTIONS` and `GROUP_BY_OPTIONS` arrays

### New Component: SortGroupPopover
- Receives current filters + onUpdateFilter callback
- Manages popover open/close state
- Renders three chip sections
- Each chip click calls `onUpdateFilter(field, value)`

### TaskFilterPanel Changes
- Import and render SortGroupPopover in the toolbar row
- Remove old sort/group controls
- Keep search, filter buttons, active filter count, clear button

### TaskListView Changes
- Add SortGroupPopover trigger button near the top of the task list area
- Pass current filters and update callback

## Sort Field Mapping

Chip label maps to `sort_by` filter value:
- 📅 Дата → `due_date`
- Aa Название → `title`
- 🕐 Создание → `created_at`
- ✏️ Обновление → `updated_at`
- ✅ Завершение → `completed_at`
- 📌 Позиция → `position`

## Group Field Mapping

Chip label maps to `group_by` filter value:
- Нет → `undefined` (no grouping)
- Проект → `project`
- Область → `area`
- Контекст → `context`
- Дедлайн → `due_date`
- Статус → `gtd_status`

## Edge Cases

- Popover on mobile: ensure touch targets are at least 44px for chips
- Popover positioning: anchor to trigger button, flip up if near bottom of viewport
- No sort when grouped by position + no grouping: use natural order (position field)
- Dark mode: chips use dark variants of colors

## Files to Modify

- `frontend/src/components/TaskFilterPanel.tsx` — remove old sort/group controls, add popover trigger
- `frontend/src/components/SortGroupPopover.tsx` — new component
- `frontend/src/components/TaskListView.tsx` — integrate popover trigger
- `frontend/src/hooks/useTaskFilter.ts` — no changes (already has group_by, sort_by, sort_order)

## i18n Keys Needed

Namespace: `tasks`
- `viewSettings` — tooltip for trigger button ("Вид списка")
- `popoverGroup` — section label ("Группировка")
- `popoverSort` — section label ("Сортировка")
- `popoverDirection` — section label ("Направление")
- `sortDueDate` — "Дата"
- `sortTitle` — "Название"
- `sortCreated` — "Создание"
- `sortUpdated` — "Обновление"
- `sortCompletedAt` — "Завершение"
- `sortPosition` — "Позиция"
- `groupNone` — "Нет"
- `directionDesc` — "Убывание"
- `directionAsc` — "Возрастание"
