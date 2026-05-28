### L4-04 — Защита от перебора кода верификации email (H-04)

**Goal:** Отдельный rate limit на /confirm-email + инвалидация после неудачных попыток.
**Input:** `backend/app/api/users.py:260`, модель User.
**Output:** Rate limit 5/мин, максимум 5 попыток, после которых код инвалидирован.
**Done when:** Перебор кода верификации невозможен.
**Acceptance criteria:**
- [ ] `/confirm-email`: отдельный rate limit `5/minute`
- [ ] Новое поле `email_verification_attempts: int` в User + миграция
- [ ] После 5 неудачных попыток — `email_verification_code` = None, ошибка
- [ ] Успешная попытка сбрасывает счётчик
- [ ] Server-side проверка срока действия кода (связано с L1-01)
**depends_on:** [L1/01, L2/03]
**impact:** 5
**complexity:** 2
**risk:** 2
**priority_score:** 6.0
**Est. effort:** S
