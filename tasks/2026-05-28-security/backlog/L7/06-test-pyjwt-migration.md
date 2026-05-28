### L7-06 — Тесты: PyJWT миграция

**Goal:** Убедиться что существующие JWT-токены валидны после миграции.
**Input:** Переписанный security.py.
**Output:** Тест encode/decode, совместимость.
**Acceptance criteria:**
- [ ] Токен созданный PyJWT валиден
- [ ] create_access_token / create_refresh_token работают
- [ ] decode_token с правильным ключом → payload
- [ ] decode_token с неправильным ключом → None
- [ ] Все существующие auth-тесты проходят
**depends_on:** [L0/01]
**impact:** 5
**complexity:** 1
**risk:** 2
**priority_score:** 12.0
**Est. effort:** XS
