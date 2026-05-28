### L5-06 — Убрать раскрытие эндпоинтов в корневом ответе API (L-06)

**Goal:** `/api/` не раскрывает список эндпоинтов.
**Input:** `backend/app/api/router.py:15`.
**Output:** Убран список endpoints из ответа.
**Done when:** `/api/` не раскрывает внутреннюю структуру.
**Acceptance criteria:**
- [ ] `endpoints` поле удалено из ответа `/api/`
- [ ] Ответ содержит только `message` и `version`
**depends_on:** []
**impact:** 2
**complexity:** 1
**risk:** 1
**priority_score:** 5.0
**Est. effort:** XS
