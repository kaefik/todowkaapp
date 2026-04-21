### L8-01 — Обновить features.md

**Goal:** Добавить запись об усилении безопасности в `docs/features.md`.

**Input:** `docs/features.md`

**Output:** Обновлённый `docs/features.md` с информацией о cookie-only аутентификации и защите от брутфорса.

**Done when:** В features.md добавлена секция о безопасности.

**Acceptance criteria:**
- [ ] Добавлена запись о переходе на cookie-only аутентификацию (httpOnly, SameSite=lax)
- [ ] Добавлена запись о защите от брутфорса (блокировка после 5 попыток)
- [ ] Формат соответствует существующему стилю features.md

**depends_on:** [L7-01, L5-04, L2-01, L6-01, L6-06]

**impact:** 2
**complexity:** 1
**risk:** 1
**priority_score:** 5.0
**Est. effort:** XS

**LLM Prompt Hint:** Добавь в docs/features.md секцию о безопасности: cookie-only аутентификация, httpOnly cookies, SameSite=lax, защита от брутфорса с блокировкой.
