### L9-01 — Frontend: Add enhanced diagnostic logging

**Goal:** Добавить детальное логирование в NotificationProvider, notificationStore и browserNotifications.

**Input:** Файлы:
- `frontend/src/components/NotificationProvider.tsx`
- `frontend/src/stores/notificationStore.ts`
- `frontend/src/utils/browserNotifications.ts`

**Output:** Обновленные файлы с детальным диагностическим логированием

**Done when:**
- NotificationProvider: логирование start/end события, taskId, enabled, isSupported, notificationData, taskTitle, решение (browser vs toast)
- notificationStore: логирование refetch (start, loaded with count/unreadCount), SSE events (event type, data)
- browserNotifications: логирование showReminder с title, permission, enabled
- Все логи имеют структурированные префиксы `[ComponentName]`

**Acceptance criteria:**
- [ ] NotificationProvider: лог "=== Reminder Event Start ===" с taskId, enabled, isSupported, notificationData
- [ ] NotificationProvider: лог taskTitle после нахождения
- [ ] NotificationProvider: лог "Will show:" с {isSupported, enabled}
- [ ] NotificationProvider: лог "=== Reminder Event End ===" после показа
- [ ] notificationStore: лог "[NotificationStore] Refetching notifications..."
- [ ] notificationStore: лог "[NotificationStore] Notifications loaded:" с count и unreadCount
- [ ] notificationStore: лог "[NotificationStore] SSE event:" с event и data
- [ ] browserNotifications: лог "[BrowserNotifications] Showing notification:" с title, permission, enabled
- [ ] Все файлы проходят TypeScript проверку

**depends_on:** [L6-01, L6-02] (но может быть done параллельно)

**impact:** 3 (medium - улучшает debuggability, не критично для production)
**complexity:** 1 (trivial - добавить console.log statements)
**risk:** 1 (safe - только логирование, не меняет логику)

**priority_score:** (3 × 2 + 1) / 1 = 7.0

**Est. effort:** S (1 hour)

**LLM Prompt Hint:**
Read three files: frontend/src/components/NotificationProvider.tsx, frontend/src/stores/notificationStore.ts, frontend/src/utils/browserNotifications.ts. Add diagnostic logging: 1) NotificationProvider: log start/end markers with all context (taskId, enabled, isSupported, notificationData, taskTitle, decision). 2) notificationStore: log refetch start/end, SSE events. 3) browserNotifications: log showReminder parameters. Use structured prefixes: [NotificationProvider], [NotificationStore], [BrowserNotifications]. Return three complete updated files.
