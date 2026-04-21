### L6-07 — Уменьшить rate limit и добавить логирование

**Goal:** Уменьшить лимит запросов к `/login` с 5 до 3 в минуту, добавить логирование при превышении.

**Input:** `backend/app/config.py` — настройки rate limit

**Output:** Обновлённый `backend/app/config.py` с `login_rate_limit: int = 3` и logging при превышении.

**Done when:** Rate limit = 3/мин. При превышении — warning в логах с IP адресом.

**Acceptance criteria:**
- [ ] `login_rate_limit: int = 3` (было 5)
- [ ] При превышении rate limit логируется `logging.warning` с IP адресом
- [ ] Существующие тесты проходят (тесты rate limit обновлены если падают)

**depends_on:** []

**impact:** 3
**complexity:** 1
**risk:** 1
**priority_score:** 7.0
**Est. effort:** XS

**LLM Prompt Hint:** В config.py измени login_rate_limit на 3. Найди где обрабатывается rate limit в api/auth.py и добавь logging.warning с IP при превышении.
