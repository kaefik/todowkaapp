### L5-01 — Создать init.ts (initialSync при логине)

**Goal:** Создать модуль, запускающий начальную синхронизацию при первом логине.
**Input:** Завершённый L2-03 (syncEngine.initialSync). `authStore` для userId.
**Output:** Файл `frontend/src/db/init.ts` с функциями `performInitialSync(userId)` и `clearLocalData(userId)`.
**Done when:** Initial sync загружает все данные с сервера в Dexie при логине. TypeScript компилируется.
**Acceptance criteria:**
- [ ] `performInitialSync(userId)` вызывает `syncEngine.initialSync(userId)`
- [ ] Обрабатывает ошибки: retry с экспоненциальной задержкой при network error
- [ ] `clearLocalData(userId)` очищает все таблицы Dexie по userId: tasks, projects, areas, contexts, tags, mutations, syncMeta
- [ ] Вызывается при logout (L5-02)
- [ ] TypeScript компилируется
**depends_on:** [L2/03]
**impact:** 5
**complexity:** 2
**risk:** 3
**priority_score:** 6.5
**Est. effort:** S
