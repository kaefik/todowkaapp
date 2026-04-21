### L2-01 — Добавить логику блокировки аккаунта при login

**Goal:** Реализовать защиту от брутфорса: после 5 неверных попыток — блокировка на 15 минут. Все ошибочные сценарии возвращают одинаковый 401.

**Input:**
- `backend/app/api/auth.py` (строки 99–128: `login()`)
- `backend/app/config.py` — добавить настройки

**Output:**
- Обновлённый `backend/app/api/auth.py` с логикой блокировки в `login()`
- Обновлённый `backend/app/config.py` с `login_max_failed_attempts` и `login_lockout_minutes`

**Done when:** 5 неверных попыток → блокировка 15 мин. Все ошибки возвращают одинаковый 401 "Incorrect username or password". Успешный вход сбрасывает счётчик.

**Acceptance criteria:**
- [ ] В `config.py`: `login_max_failed_attempts: int = 5`, `login_lockout_minutes: int = 15`
- [ ] В `login()`: после нахождения пользователя — проверить `locked_until`
- [ ] Если `user is None` → 401 "Incorrect username or password" (без увеличения счётчика)
- [ ] Если `locked_until > now` → 401 "Incorrect username or password" (не 429!)
- [ ] Неверный пароль: `failed_login_attempts += 1`, если >= max → `locked_until = now + timedelta(minutes=...)`
- [ ] Верный пароль: `failed_login_attempts = 0`, `locked_until = None`
- [ ] Все ошибочные ответы идентичны: 401 + "Incorrect username or password"
- [ ] `pytest tests/ -v` проходит (возможно новые тесты для блокировки)

**depends_on:** [L1-01]

**impact:** 4
**complexity:** 3
**risk:** 3
**priority_score:** 3.67
**Est. effort:** M

**LLM Prompt Hint:** В api/auth.py login() добавь логику блокировки: найти user → проверить locked_until → проверить пароль → при ошибке increment failed_login_attempts → при достижении лимита установить locked_until → при успехе сбросить. Все ошибки = 401 "Incorrect username or password". Настройки в config.py.
