### L5-01 — Проверить поддержку SSE в Vite proxy

**Goal:** Исследовать и документировать поддерживает ли Vite proxy Server-Sent Events (long-lived connections).
**Input:** Файл `frontend/vite.config.ts`, документация Vite
**Output:** Документация с результатами исследования и рекомендациями
**Done when:** Есть четкое понимание нужно ли использовать fallback для SSE или можно использовать Vite proxy.
**Acceptance criteria:**
- [ ] Изучена документация Vite proxy о поддержке SSE
- [ ] Проверены текущие настройки proxy в vite.config.ts
- [ ] Документированы ограничения если они есть
- [ ] Сделан вывод: использовать Vite proxy или fallback
- [ ] Если нужен fallback, указано какой вариант (прямое подключение или query parameter)
**depends_on:** []
**impact:** 3 (влияет на архитектуру SSE подключений)
**complexity:** 1 (исследование)
**risk:** 1 (безопасно)
**priority_score:** (3 × 2 + 1) / 1 = 7.0
**Est. effort:** S (1h)
**LLM Prompt Hint:** Это исследовательская задача. Изучите:
1. Текущие настройки proxy в frontend/vite.config.ts
2. Документацию Vite о SSE поддержке (поищите "server-sent events" или "SSE")
3. Известные проблемы с long-lived connections в Vite proxy
4. Создайте документ с выводами и рекомендациями
Не пишите код, только анализ и документацию.
