### L1-02 — Создать migration.ts (удаление старых IDB баз)

**Goal:** Создать модуль для удаления 4 старых IndexedDB баз при первом запуске новой архитектуры.
**Input:** Завершённый L1-01.
**Output:** Файл `frontend/src/db/migration.ts` с функцией `migrateOldData()`.
**Done when:** Файл создан, TypeScript компилируется.
**Acceptance criteria:**
- [ ] Функция `migrateOldData()` удаляет 4 базы: `todowka-query-cache`, `todowka-cache`, `todowka-local-changes`, `todowka-offline`
- [ ] Обрабатывает `onsuccess`, `onerror`, `onblocked` (не падает на ошибках)
- [ ] Возвращает `Promise<void>`
**depends_on:** [L1/01]
**impact:** 2
**complexity:** 1
**risk:** 1
**priority_score:** 5.0
**Est. effort:** XS
**LLM Prompt Hint:** "Create frontend/src/db/migration.ts with a function migrateOldData() that deletes 4 old IndexedDB databases (todowka-query-cache, todowka-cache, todowka-local-changes, todowka-offline). Handle onsuccess/onerror/onblocked gracefully."
