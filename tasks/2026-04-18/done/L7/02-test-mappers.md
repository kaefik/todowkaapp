### L7-02 — Unit-тесты для mappers.ts

**Goal:** Написать тесты для dbTaskToUi и apiTaskToDb.
**Input:** Завершённый L2-02.
**Output:** Файл `frontend/src/db/__tests__/mappers.test.ts`.
**Done when:** Все тесты проходят (`vitest run`).
**Acceptance criteria:**
- [ ] Тест: apiTaskToDb — корректный маппинг всех полей из snake_case API в camelCase DbTask
- [ ] Тест: apiTaskToDb — tagIds извлекаются из tags[].id
- [ ] Тест: apiTaskToDb — _syncStatus='synced', _lastSyncedAt заполнен
- [ ] Тест: apiTaskToDb — JSON.stringify для recurrenceConfig, reminderOffsets
- [ ] Тест: dbTaskToUi — корректный маппинг обратно в UiTask
- [ ] Тест: dbTaskToUi — JSON.parse для recurrenceConfig, reminderOffsets
- [ ] Тест: dbTaskToUi — tags join из db.tags
- [ ] Тест: dbTaskToUi — project join из db.projects
- [ ] Тест: dbTaskToUi — context join из db.contexts
- [ ] Тест: dbTaskToUi — subtasks count вычисляется динамически
- [ ] Тест: dbTaskToUi — soft-deleted tags/projects/contexts не включаются
**depends_on:** [L2/02]
**impact:** 3
**complexity:** 1
**risk:** 1
**priority_score:** 7.0
**Est. effort:** S
