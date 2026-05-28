### L5-02 — Уменьшить TTL JWT access token для заблокированных (M-03)

**Goal:** Уменьшить TTL access_token с 15 мин до 5 мин для более быстрой реакции на блокировку.
**Input:** `backend/app/config.py:12`.
**Output:** `access_token_expire_minutes: int = 5`.
**Done when:** Access token живёт 5 минут.
**Acceptance criteria:**
- [ ] `access_token_expire_minutes` default = 5
- [ ] `.env.example` обновлён с комментарием
- [ ] Refresh flow работает корректно с новым TTL
**depends_on:** []
**impact:** 4
**complexity:** 1
**risk:** 2
**priority_score:** 10.0
**Est. effort:** XS
