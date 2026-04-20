### L7-04 — Test: Inactive tab behavior

**Goal:** Проверить что уведомления загружаются при возврате на неактивную вкладку.

**Input:** Приложение с выполненными L6-01, L5-01, L5-02

**Output:** Результаты теста (console logs, UI verification)

**Done when:**
- SSE reconnect при возврате на вкладку
- Уведомления загружаются через refetch
- Колокольчик обновляется

**Acceptance criteria:**
- [ ] Создано напоминание на +2 минуты
- [ ] Переключение на другую вкладку
- [ ] Подождано 3 минуты
- [ ] Возврат на вкладку приложения
- [ ] Console показывает: "[NotificationStore] SSE event: ..."
- [ ] Console показывает: "[NotificationProvider] === Reminder Event Start ==="
- [ ] Колокольчик обновился
- [ ] Уведомления видны в dropdown

**depends_on:** [L6-01, L5-01, L5-02]

**impact:** 4 (high - edge case для неактивных вкладок)
**complexity:** 1 (trivial - ручное тестирование)
**risk:** 1 (safe - только тестирование)

**priority_score:** (4 × 2 + 1) / 1 = 9.0

**Est. effort:** S (30 minutes)

**LLM Prompt Hint:**
Manual test: 1) Create reminder for +2 minutes. 2) Switch to another tab. 3) Wait 3 minutes. 4) Return to app tab. 5) Check console for SSE event and handler logs. 6) Verify bell updated, notifications loaded. Document results.
