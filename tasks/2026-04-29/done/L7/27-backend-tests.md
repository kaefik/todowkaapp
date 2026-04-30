### L7-27 — Backend тесты: Session + Review

**Goal:** Написать тесты для новых backend компонентов.

**Input:** SessionService, ReviewService, Session API, Review API.

**Output:** Тестовые файлы в `backend/tests/`.

**Done when:** Все тесты проходят.

**Acceptance criteria:**
- [ ] Тесты SessionService: create_session, get_user_sessions, revoke_session, revoke_all_sessions, update_activity, cleanup_expired
- [ ] Тесты ReviewService: get_review_status (inbox count, projects with has_next_action, someday tasks), complete_review (updates user fields)
- [ ] Тесты Session API: GET /api/sessions, DELETE /api/sessions/{id}, DELETE /api/sessions
- [ ] Тесты Review API: GET /api/review/status, POST /api/review/complete
- [ ] `pytest tests/ -v` проходит

**depends_on:** [L3-11, L3-09]

**impact:** 3 | **complexity:** 2 | **risk:** 2
**priority_score:** 5.0
**Est. effort:** M (~2h)
