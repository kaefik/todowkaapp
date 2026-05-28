### L2-05 — Устранить email/username enumeration при регистрации (M-08)

**Goal:** Единое сообщение об ошибке + одинаковая длительность ответа для username/email.
**Input:** `backend/app/api/auth.py:79-91`.
**Output:** Обе проверки выполняются всегда, единое сообщение.
**Done when:** Timing-атака невозможна, сообщение не раскрывает какое именно поле занято.
**Acceptance criteria:**
- [ ] Проверки username и email выполняются параллельно/всегда обе
- [ ] Единое сообщение: `"Username or email already exists"`
- [ ] Одинаковое время ответа для обоих случаев
**depends_on:** []
**impact:** 4
**complexity:** 1
**risk:** 1
**priority_score:** 9.0
**Est. effort:** XS
