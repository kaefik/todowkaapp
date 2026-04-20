### L7-06 — Test: Store empty when SSE event fires

**Goal:** Проверить что данные берутся из SSE payload когда store пустой.

**Input:** Приложение с выполненными L1-01, L6-02

**Output:** Результаты теста (console logs, UI verification)

**Done when:**
- Уведомление показывает корректный title (не "Напоминание")
- Данные берутся из SSE payload, не зависят от store

**Acceptance criteria:**
- [ ] DevTools → Console открыт
- [ ] Store очищен: `window.useNotificationStore?.getState?.()?.setNotifications([])`
- [ ] Создано напоминание на +1 минуту
- [ ] Подождано 2 минуты
- [ ] Console показывает: "[NotificationProvider] notificationData: { id: ..., message: ... }"
- [ ] Console показывает: "[NotificationProvider] Using notification data from event: ..."
- [ ] Title в уведомлении корректный (не "Напоминание")
- [ ] Уведомление содержит правильное название задачи

**depends_on:** [L1-01, L6-02]

**impact:** 5 (core feature - SSE payload data)
**complexity:** 1 (trivial - ручное тестирование)
**risk:** 1 (safe - только тестирование)

**priority_score:** (5 × 2 + 1) / 1 = 11.0

**Est. effort:** S (30 minutes)

**LLM Prompt Hint:**
Manual test: 1) Open DevTools → Console. 2) Clear store: `window.useNotificationStore?.getState?.()?.setNotifications([])`. 3) Create reminder for +1 minute. 4) Wait 2 minutes. 5) Check console for notificationData logs. 6) Verify notification shows correct title (not "Напоминание"), data from SSE payload. Document results.
