### L7/05 — Тесты: SSE reconnect, polling fallback, EventBus overflow

**Goal:** Написать тесты для фронтенд-компонентов: бесконечный SSE реконнект, polling fallback, EventBus overflow → refetch.

**Input:**
- Обновлённый sseManager (L5/02)
- Обновлённый notificationStore (L5/03)
- Обновлённый EventBus (L5/01)

**Output:**
- Новые/обновлённые тесты в `frontend/src/__tests__/` или аналогичной директории

**Done when:**
Все перечисленные тесты проходят:

1. `test_sse_infinite_reconnect` — нет лимита попыток, backoff корректный
2. `test_polling_activates_on_sse_failure` — Polling стартует при падении SSE
3. `test_polling_stops_on_sse_recovery` — Polling останавливается при восстановлении SSE
4. `test_eventbus_overflow_triggers_refetch` — Queue overflow → клиент делает refetch

**Acceptance criteria:**
- [ ] `test_sse_infinite_reconnect`: мокнуть EventSource, вызвать 10+ ошибок, проверить что реконнект продолжается
- [ ] `test_polling_activates_on_sse_failure`: установить SSE state=error, подождать 30сек (или мокнуть таймер), проверить polling active
- [ ] `test_polling_stops_on_sse_recovery`: установить SSE state=connected, проверить polling stopped
- [ ] `test_eventbus_overflow_triggers_refetch`: мокнуть EventBus чтобы отправил queue_overflow, проверить refetch вызван

**depends_on:** [L5/02, L5/03, L5/01]
**impact:** 3
**complexity:** 2
**risk:** 1
**priority_score:** 3.5
**Est. effort:** S

**LLM Prompt Hint:** "Напиши фронтенд тесты: test_sse_infinite_reconnect, test_polling_activates_on_sse_failure, test_polling_stops_on_sse_recovery, test_eventbus_overflow_triggers_refetch. Мокай EventSource, таймеры, API calls. Используй vitest."
