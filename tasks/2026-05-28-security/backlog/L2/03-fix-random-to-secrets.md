### L2-03 — Замена random на secrets для генерации кода верификации (H-03)

**Goal:** Использовать CSPRNG вместо `random` для генерации кода верификации email.
**Input:** `backend/app/api/users.py:237`.
**Output:** `secrets.choice` вместо `random.choices`.
**Done when:** Код верификации генерируется криптографически безопасным RNG.
**Acceptance criteria:**
- [ ] `import secrets` добавлен в users.py
- [ ] `random.choices(string.digits, k=6)` заменён на `"".join(secrets.choice(string.digits) for _ in range(6))`
- [ ] `import random` удалён из users.py если больше не используется
**depends_on:** []
**impact:** 4
**complexity:** 1
**risk:** 1
**priority_score:** 9.0
**Est. effort:** XS
