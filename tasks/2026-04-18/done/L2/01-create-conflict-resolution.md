### L2-01 — Создать conflictResolution.ts (LWW merge + shouldSkipMerge)

**Goal:** Реализовать стратегию разрешения конфликтов Last-Writer-Wins и проверку pending mutations.
**Input:** Завершённый L1-01 (типы `SyncStatus`, `db`).
**Output:** Файл `frontend/src/db/conflictResolution.ts` с функциями `shouldSkipMerge()` и `mergeRecord()`.
**Done when:** Файл создан, TypeScript компилируется.
**Acceptance criteria:**
- [ ] `shouldSkipMerge(entityType, entityId)` проверяет `db.mutations` на наличие pending мутаций
- [ ] `mergeRecord<T extends Mergeable>(localRecord, serverRecord)` реализует LWW:
  - Нет локальной → вернуть серверную
  - Локальная `synced` → вернуть серверную
  - Серверная новее по `updatedAt` → вернуть серверную
  - Иначе → вернуть локальную
- [ ] Интерфейс `Mergeable` требует `updatedAt`, `_syncStatus`, `_lastSyncedAt`
**depends_on:** [L1/01]
**impact:** 4
**complexity:** 2
**risk:** 3
**priority_score:** 5.5
**Est. effort:** S
**LLM Prompt Hint:** "Create frontend/src/db/conflictResolution.ts with shouldSkipMerge() that checks db.mutations for pending entries, and mergeRecord() that implements LWW based on updatedAt. Import db and SyncStatus from ./database."
