### L6-03 — Заменить логирование части токена на user_id

**Goal:** Убрать логирование фрагмента JWT-токена, заменить на логирование user_id.

**Input:** `backend/app/dependencies.py` (строка ~28: `logger.debug(f"Token: {token[:10]}...rest via {auth_type}")`)

**Output:** Обновлённый `backend/app/dependencies.py` — вместо части токена логируется `user_id` из payload.

**Done when:** В логах нет фрагментов JWT-токена, вместо них `Auth via {auth_type}, user_id={sub}`.

**Acceptance criteria:**
- [ ] Удалена строка `logger.debug(f"Token: {token[:10]}...rest via {auth_type}")`
- [ ] После успешного decode добавлена `logger.debug(f"Auth via {auth_type}, user_id={payload.get('sub')}")`
- [ ] Существующие тесты проходят

**depends_on:** []

**impact:** 3
**complexity:** 1
**risk:** 1
**priority_score:** 7.0
**Est. effort:** XS

**LLM Prompt Hint:** В dependencies.py замени logger.debug с логированием части токена на логирование user_id из payload после decode.
