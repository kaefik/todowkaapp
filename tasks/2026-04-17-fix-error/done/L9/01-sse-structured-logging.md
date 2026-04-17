### L9-01 — Добавить структурированное логирование SSE соединений

**Goal:** Улучшить логирование в SSE менеджере с использованием структурированных логов (timestamp, уровень, контекст).
**Input:** Файл `frontend/src/services/sseManager.ts`
**Output:** Обновленный `frontend/src/services/sseManager.ts` со структурированным логированием
**Done when:** Все события SSE (подключение, сообщения, ошибки, отключение) логируются с контекстом.
**Acceptance criteria:**
- [ ] Добавлен логгер с уровнями (info, warn, error, debug)
- [ ] При успешном подключении логируется info с URL и timestamp
- [ ] При получении сообщения логируется debug с типом события и данными
- [ ] При ошибке логируется error с деталями и номером попытки
- [ ] При отключении логируется info с причиной и продолжительностью соединения
- [ ] Логи включают префикс "[SSE]" для фильтрации
**depends_on:** [L5/02, L6/01]
**impact:** 2 (помогает диагностировать проблемы SSE)
**complexity:** 2 (простое логирование)
**risk:** 1 (безопасно)
**priority_score:** (2 × 2 + 1) / 2 = 2.5
**Est. effort:** S (1h)
**LLM Prompt Hint:** В frontend/src/services/sseManager.ts создайте простой логгер:
```ts
const logger = {
  info: (msg: string, data?: any) => console.log(`[SSE] [INFO] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[SSE] [WARN] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[SSE] [ERROR] ${msg}`, data || ''),
  debug: (msg: string, data?: any) => console.debug(`[SSE] [DEBUG] ${msg}`, data || ''),
};
```
Добавьте логирование в key моменты: подключение, сообщения, ошибки, отключение. Включайте timestamp через new Date().toISOString().
