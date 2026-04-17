### L9-02 — Добавить метрики состояния SSE соединения

**Goal:** Создать store для отслеживания метрик SSE соединения (статус, количество попыток, время последней попытки, общее время подключения).
**Input:** Файлы `frontend/src/stores/notificationStore.ts` (или создать новый sseStore.ts)
**Output:** Обновленный или новый store с метриками SSE
**Done when:** Есть реактивные метрики которые можно использовать в UI для отображения состояния SSE.
**Acceptance criteria:**
- [ ] Создан новый store `sseStore.ts` или добавлены метрики в `notificationStore.ts`
- [ ] Добавлено поле `connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'`
- [ ] Добавлено поле `reconnectAttempts: number`
- [ ] Добавлено поле `lastAttemptTime: Date | null`
- [ ] Добавлено поле `totalConnectedTime: number` (в секундах)
- [ ] Добавлено поле `lastError: string | null`
- [ ] Все поля реактивны (Zustand)
- [ ] Есть actions для обновления метрик
**depends_on:** [L5/02, L6/01, L9/01]
**impact:** 3 (позволяет показать статус SSE в UI)
**complexity:** 2 (простой store)
**risk:** 1 (безопасно)
**priority_score:** (3 × 2 + 1) / 2 = 3.5
**Est. effort:** S (1h)
**LLM Prompt Hint:** Создайте frontend/src/stores/sseStore.ts с Zustand:
```ts
interface SSEState {
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  reconnectAttempts: number;
  lastAttemptTime: Date | null;
  totalConnectedTime: number;
  lastError: string | null;
  updateStatus: (status: SSEState['connectionStatus']) => void;
  incrementAttempts: () => void;
  resetAttempts: () => void;
  recordError: (error: string) => void;
}
```
Используйте create с initialState и actions. Интегрируйте этот store в sseManager.ts для обновления метрик.
