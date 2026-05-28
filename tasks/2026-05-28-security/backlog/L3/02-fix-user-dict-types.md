### L3-02 — Исправить типы User vs dict в telegram_auth (T-04)

**Goal:** Заменить `current_user: dict` на `current_user: User` + исправить DI в get_bind_link.
**Input:** `backend/app/api/telegram_auth.py:49,70`.
**Output:** Все эндпоинты telegram_auth используют `User` тип и `Depends(get_db)`.
**Done when:** Нет AttributeError/TypeError при вызовах telegram-эндпоинтов.
**Acceptance criteria:**
- [ ] `current_user: dict` → `current_user: User` во всех telegram-эндпоинтах
- [ ] `current_user.get("id")` → `str(current_user.id)` или аналогично
- [ ] `current_user["sub"]` → `str(current_user.id)` (вместо JWT sub)
- [ ] `get_bind_link` использует `db: AsyncSession = Depends(get_db)` вместо `AsyncSessionLocal()`
- [ ] Нет ручного создания сессий через `AsyncSessionLocal`
**depends_on:** []
**impact:** 5
**complexity:** 1
**risk:** 2
**priority_score:** 12.0
**Est. effort:** XS
