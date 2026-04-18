### L0-01 — Установить npm-пакеты dexie, dexie-react-hooks, uuid

**Goal:** Добавить зависимости для IndexedDB (Dexie.js) и генерации клиентских UUID.
**Input:** Текущий `frontend/package.json`.
**Output:** Обновлённый `frontend/package.json` + `frontend/package-lock.json` с новыми зависимостями.
**Done when:** `npm ls dexie dexie-react-hooks uuid` показывает установленные пакеты без ошибок.
**Acceptance criteria:**
- [ ] `dexie` установлен (последняя стабильная версия)
- [ ] `dexie-react-hooks` установлен
- [ ] `uuid` установлен
- [ ] `npm run build` собирается без ошибок
**depends_on:** []
**impact:** 5
**complexity:** 1
**risk:** 1
**priority_score:** 11.0
**Est. effort:** XS
**LLM Prompt Hint:** "Install npm packages dexie, dexie-react-hooks, and uuid in the frontend directory. Run: cd frontend && npm install dexie dexie-react-hooks uuid"
