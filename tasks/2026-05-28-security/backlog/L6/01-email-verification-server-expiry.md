### L6-01 — Server-side срок действия кода верификации email (M-06)

**Goal:** Проверять `email_verification_code_expires_at` при подтверждении email.
**Input:** Поле из L1-01, `backend/app/api/users.py:260`.
**Output:** Код истекает через 15 минут, просроченный код отклоняется.
**Done when:** Просроченный код верификации отклоняется сервером.
**Acceptance criteria:**
- [ ] При отправке кода: `email_verification_code_expires_at = datetime.now(UTC) + timedelta(minutes=15)`
- [ ] При подтверждении: проверка `datetime.now(UTC) <= email_verification_code_expires_at`
- [ ] Просроченный код: ошибка `"Verification code expired"`
- [ ] После успешного подтверждения: `email_verification_code_expires_at = None`
**depends_on:** [L1/01]
**impact:** 4
**complexity:** 1
**risk:** 1
**priority_score:** 9.0
**Est. effort:** XS
