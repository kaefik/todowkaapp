### L4-03 — Удалить SSETokenMiddleware и обновить sse.py

**Goal:** Удалить middleware, конвертирующий `?token=` в Authorization header. Обновить SSE-эндпоинты для использования `get_current_user`.

**Input:**
- `backend/app/main.py` (строки 32–48: `SSETokenMiddleware`, строка 88: `app.add_middleware(SSETokenMiddleware)`)
- `backend/app/api/sse.py` (строка 9: `from app.dependencies import get_current_user_from_cookie`)

**Output:**
- Обновлённый `backend/app/main.py` без `SSETokenMiddleware`
- Обновлённый `backend/app/api/sse.py` с `from app.dependencies import get_current_user`

**Done when:** `pytest tests/ -v` проходит. `SSETokenMiddleware` не существует. SSE-эндпоинты используют `get_current_user`.

**Acceptance criteria:**
- [ ] Класс `SSETokenMiddleware` удалён из `main.py`
- [ ] `app.add_middleware(SSETokenMiddleware)` удалён
- [ ] Импорт `parse_qs` удалён (если больше не используется)
- [ ] В `sse.py`: `from app.dependencies import get_current_user_from_cookie` → `from app.dependencies import get_current_user`
- [ ] В обоих эндпоинтах (`notification_stream`, `sync_stream`): `Depends(get_current_user_from_cookie)` → `Depends(get_current_user)`
- [ ] Существующие тесты проходят

**depends_on:** [L4-02]

**impact:** 4
**complexity:** 2
**risk:** 3
**priority_score:** 5.5
**Est. effort:** XS

**LLM Prompt Hint:** Удали SSETokenMiddleware из main.py (класс + add_middleware). В sse.py замени импорт get_current_user_from_cookie на get_current_user и обнови Depends в обоих эндпоинтах.
