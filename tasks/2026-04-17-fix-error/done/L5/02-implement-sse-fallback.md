### L5-02 — Реализовать fallback для SSE подключений

**Goal:** Добавить условный URL для SSE подключений: прямое подключение к backend в dev режиме, через proxy в production.
**Input:** Файл `frontend/src/services/sseManager.ts`
**Output:** Обновленный `frontend/src/services/sseManager.ts` с условным SSE URL
**Done when:** В dev режиме SSE подключается к `http://localhost:8000/api/sse/notifications`, в production через `/api/sse/notifications`.
**Acceptance criteria:**
- [ ] Добавлен условный SSE URL на основе `import.meta.env.DEV`
- [ ] В dev режиме используется `http://localhost:8000/api/sse/notifications`
- [ ] В production используется `/api/sse/notifications` (через Vite proxy)
- [ ] Cookie для localhost:8000 устанавливается корректно (secure=False в dev)
- [ ] Добавлен комментарий объясняющий логику выбора URL
**depends_on:** [L4/01, L5/01]
**impact:** 5 (исправляет критическую ошибку SSE 401)
**complexity:** 2 (простая условная логика)
**risk:** 2 (безопасно, использует проверенное решение)
**priority_score:** (5 × 2 + 2) / 2 = 6.0
**Est. effort:** S (1h)
**LLM Prompt Hint:** В frontend/src/services/sseManager.ts найдите создание EventSource. Замените жестко заданный URL на условный:
```ts
const sseUrl = import.meta.env.DEV
  ? 'http://localhost:8000/api/sse/notifications'
  : '/api/sse/notifications';
```
Убедитесь, что cookie с access_token устанавливается с domain=localhost в dev режиме для работы с прямым подключением.
