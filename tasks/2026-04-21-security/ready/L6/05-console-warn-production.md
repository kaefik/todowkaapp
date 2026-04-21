### L6-05 — Убрать console.warn в production (frontend)

**Goal:** Обернуть все console.warn/error/log в `if (import.meta.env.DEV)` чтобы не утекать информация в production.

**Input:**
- `frontend/src/stores/authStore.ts` — несколько console.warn/error
- `frontend/src/services/sseManager.ts` — logger с console.warn/error

**Output:** Обновлённые файлы без console output в production.

**Done when:** В production-сборке нет console.warn/error/log из authStore и sseManager.

**Acceptance criteria:**
- [ ] В `authStore.ts`: все console.warn/error/log обёрнуты в `if (import.meta.env.DEV) { ... }`
- [ ] В `sseManager.ts`: аналогично, или logger заменён на заглушку в production
- [ ] `npx tsc --noEmit` без ошибок
- [ ] `npm run lint` без ошибок

**depends_on:** []

**impact:** 2
**complexity:** 1
**risk:** 1
**priority_score:** 5.0
**Est. effort:** XS

**LLM Prompt Hint:** Оберни все console.warn/error/log в authStore.ts и sseManager.ts в if (import.meta.env.DEV) { ... }. Или замени logger в sseManager на заглушку в production.
