### L7-03 — Написать тест лимита переподключений SSE

**Goal:** Создать тест для проверки что SSE менеджер останавливает переподключения после лимита попыток.
**Input:** Файл `frontend/src/services/sseManager.ts`, структура тестов frontend
**Output:** Тестовый файл `frontend/src/services/__tests__/sseManager.test.ts` с тестами переподключений
**Done when:** Тест проверяет что после MAX_RECONNECT_ATTEMPTS переподключения прекращаются.
**Acceptance criteria:**
- [ ] Создан тестовый файл sseManager.test.ts
- [ ] Тест создает SSE менеджер
- [ ] Тест симулирует N неудачных попыток подключения
- [ ] Тест проверяет что после MAX_RECONNECT_ATTEMPTS переподключения прекращаются
- [ ] Тест проверяет что счетчик попыток корректно сбрасывается
- [ ] Тест использует fake timers или jest.useFakeTimers для управления временем
**depends_on:** [L6/01]
**impact:** 2 (обеспечает надежность SSE)
**complexity:** 4 (требует моков EventSource и таймеров)
**risk:** 1 (безопасно, только тесты)
**priority_score:** (2 × 2 + 1) / 4 = 1.25
**Est. effort:** L (4h) <!-- WARNING: Сложно тестировать из-за EventSource, можно разбить на два теста -->
**LLM Prompt Hint:** Создайте frontend/src/services/__tests__/sseManager.test.ts. Используйте Vitest/Jest. Напишите тест:
1. Мокайте EventSource для симуляции ошибок
2. Создайте SSE менеджер
3. Симулируйте 5 неудачных попыток подключения
4. Проверьте что после 5 попыток reconnect не вызывается
5. Проверьте что reconnectAttempts == 5
6. Проверьте что resetReconnectAttempts() сбрасывает счетчик
Используйте vi.useFakeTimers() для управления setTimeout.
ПРИМЕЧАНИЕ: Если это слишком сложно, упростите тест до проверки только логики счетчика без EventSource.
