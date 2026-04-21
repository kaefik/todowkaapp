### L4-02 — Переписать get_current_user как cookie-first с Bearer fallback

**Goal:** Изменить `get_current_user` чтобы сначала читал токен из cookie, потом из Bearer header (fallback). Удалить `get_current_user_from_cookie`.

**Input:** `backend/app/dependencies.py` (строки 76–90: `get_current_user` + `get_current_user_from_cookie`)

**Output:** Обновлённый `backend/app/dependencies.py` — единый `get_current_user` с cookie-first логикой.

**Done when:** `pytest tests/ -v` проходит. `get_current_user_from_cookie` не существует. `get_current_user` читает cookie первым.

**Acceptance criteria:**
- [ ] `get_current_user` принимает `access_token: Annotated[str | None, Cookie()] = None` как первый параметр
- [ ] Fallback на `credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_security_optional)] = None`
- [ ] Логика: `token = access_token or (credentials.credentials if credentials else None)`
- [ ] Если `token is None` — raise 401
- [ ] `auth_type = "cookie" if access_token else "header"`
- [ ] Вызывает `_resolve_user_by_token(token, db, auth_type=auth_type)`
- [ ] `get_current_user_from_cookie` удалена
- [ ] `get_current_admin_user` не изменён (зависит от `get_current_user`)
- [ ] Существующие тесты проходят

**depends_on:** [L4-01]

**impact:** 5
**complexity:** 3
**risk:** 5
**priority_score:** 5.0
**Est. effort:** S

**LLM Prompt Hint:** Перепиши get_current_user в dependencies.py: cookie-first (access_token из Cookie), fallback на Bearer header через _security_optional. Удали get_current_user_from_cookie.
