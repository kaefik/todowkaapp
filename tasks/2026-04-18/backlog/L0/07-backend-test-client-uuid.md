### L0-07 — Backend: Тест — POST с client-provided ID

**Goal:** Добавить тесты, подтверждающие что бекенд принимает и возвращает client-provided UUID для всех сущностей.
**Input:** Завершённые L0-02..06.
**Output:** Тесты в `backend/tests/`.
**Done when:** `pytest tests/ -v -k "client_id"` все проходят.
**Acceptance criteria:**
- [ ] Тест: POST /api/tasks с id → 201 с тем же id
- [ ] Тест: POST /api/projects с id → 201 с тем же id
- [ ] Тест: POST /api/areas с id → 201 с тем же id
- [ ] Тест: POST /api/contexts с id → 201 с тем же id
- [ ] Тест: POST /api/tags с id → 201 с тем же id
- [ ] Тест: POST без id → бекенд генерирует UUID
**depends_on:** [L0/02, L0/03, L0/04, L0/05, L0/06]
**impact:** 3
**complexity:** 1
**risk:** 2
**priority_score:** 8.0
**Est. effort:** S
