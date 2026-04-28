# Truncated Task Description

## Problem
Task descriptions are displayed in full everywhere — list, detail, Telegram. Long descriptions clutter the task list and Telegram notifications.

## Decision
- Truncate descriptions to ~100 characters in task list and Telegram
- Show "Ещё..." link to open full description in TaskDetailModal
- Keep full text in edit mode and when search highlight is active

## Scope

### Frontend: New component
- `TruncatedDescription` — reusable component
- Props: text, searchQuery, maxLength (default 100), onExpand callback
- If text <= maxLength → render as-is with HighlightText
- If searchQuery is active → render full text with HighlightText (no truncation during search)
- If text > maxLength → show truncated text + "Ещё..." button, opens TaskDetailModal on click

### Frontend: TaskListView.tsx (3 locations)
Replace description blocks at lines ~482, ~626, ~756 with TruncatedDescription.

### Frontend: Tasks.tsx (3 locations)
Replace description blocks at lines ~368, ~448, ~546 with TruncatedDescription.

### Backend: telegram_notifier.py
Truncate description to 100 chars + "..." in notification message (line ~83-84).

### Not changed
- Edit Task modal — full textarea
- TaskDetailModal — full description
- Database schema — no changes
- API schemas — no changes
