### L6-03 — Email verification code не хранится в открытом виде в БД (L-02)

**Goal:** Хешировать код верификации email перед сохранением в БД.
**Input:** `backend/app/models/user.py:36`, `backend/app/api/users.py`.
**Output:** Код хешируется bcrypt, сравнение через verify.
**Acceptance criteria:**
- [ ] Код хешируется перед сохранением
- [ ] Сравнение через constant-time функцию
- [ ] Срок действия и лимит попыток работают с хешированным кодом
- [ ] Миграция: сбросить все существующие незахешированные коды
**depends_on:** [L4/04, L6/01]
**impact:** 3
**complexity:** 2
**risk:** 2
**priority_score:** 4.0
**Est. effort:** S
