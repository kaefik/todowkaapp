### L7-03 — Test: SSE reconnect with polling fallback

**Goal:** Проверить автоматическое переключение SSE ↔ polling.

**Input:** Приложение с выполненными L6-01, L5-01, L5-02

**Output:** Результаты теста (console logs, Network tab verification)

**Done when:**
- SSE падает при потере интернета
- Polling запускается автоматически
- SSE восстанавливается при восстановлении интернета
- Polling останавливается автоматически

**Acceptance criteria:**
- [ ] DevTools → Network и Console открыты
- [ ] SSE соединение найдено и активно
- [ ] Интернет отключен
- [ ] Подождано 30 секунд
- [ ] Console показывает: "[SSE] Connection error: ..."
- [ ] Console показывает: "[NotificationStore] Starting polling fallback due to error"
- [ ] Console показывает: "[NotificationStore] Polling for new notifications" (каждые 30 сек)
- [ ] Интернет включен
- [ ] Console показывает: "[SSE] Connection opened"
- [ ] Console показывает: "[SSE] SSE restored, stopping polling fallback"
- [ ] Polling остановлен (нет новых логов "Polling for new notifications")

**depends_on:** [L6-01, L5-01, L5-02]

**impact:** 5 (core feature - отказоустойчивость)
**complexity:** 1 (trivial - ручное тестирование)
**risk:** 1 (safe - только тестирование)

**priority_score:** (5 × 2 + 1) / 1 = 11.0

**Est. effort:** S (30 minutes)

**LLM Prompt Hint:**
Manual test: 1) Open DevTools → Network and Console. 2) Find active SSE connection. 3) Disable internet. 4) Wait 30 seconds. 5) Check console for error and polling start logs. 6) Enable internet. 7) Check console for SSE reconnect and polling stop logs. 8) Verify SSE ↔ polling switching works automatically. Document results.
