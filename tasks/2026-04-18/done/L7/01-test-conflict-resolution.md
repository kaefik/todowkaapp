### L7-01 — Unit-тесты для conflictResolution.ts

**Goal:** Написать тесты для LWW merge логики и shouldSkipMerge.
**Input:** Завершённый L2-01.
**Output:** Файл `frontend/src/db/__tests__/conflictResolution.test.ts`.
**Done when:** Все тесты проходят (`vitest run`).
**Acceptance criteria:**
- [ ] Тест: mergeRecord — нет локальной → вернуть серверную
- [ ] Тест: mergeRecord — локальная synced → вернуть серверную
- [ ] Тест: mergeRecord — локальная modified, серверная новее → вернуть серверную
- [ ] Тест: mergeRecord — локальная modified, локальная новее → вернуть локальную
- [ ] Тест: mergeRecord — равные updatedAt → вернуть локальную
- [ ] Тест: shouldSkipMerge — есть pending mutations → true
- [ ] Тест: shouldSkipMerge — нет pending mutations → false
**depends_on:** [L2/01]
**impact:** 3
**complexity:** 1
**risk:** 1
**priority_score:** 7.0
**Est. effort:** S
