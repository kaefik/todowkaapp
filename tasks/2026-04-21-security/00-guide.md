# Execution Guide — Security Fix (Cookie-only Auth)

Generated: 2026-04-21

## Project Context

Исправление 9 проблем безопасности (3 критические, 2 высокие, 3 средние, 1 низкая), выявленных аудитом. Корневая проблема — токены выдаются одновременно в httpOnly cookie и JSON-ответе, что нивелирует защиту cookie. Переход на cookie-only модель аутентификации с httpOnly cookies, усиление защиты от брутфорса, исправление утечек информации.

## Tech Stack

- Backend: Python 3.12+, FastAPI, SQLAlchemy 2.0 (async), SQLite + aiosqlite, Pydantic v2
- Frontend: React 18+, TypeScript, Vite 8, Zustand, Tailwind CSS
- Auth: JWT (python-jose), bcrypt, httpOnly cookies
- Testing: pytest (backend), npm test (frontend)
- Observability: Python logging

## Execution Style

execution_style: careful

Высокий риск регрессии в Итерации 1a (cookie-only). Каждый шаг проверять тестами перед переходом к следующему. Быстрые исправления (L6) можно выполнять параллельно.

## Code Conventions

- Backend: async/await, слоистая архитектура (API → Services → Models), type hints
- Frontend: TypeScript, Zustand для состояния, React Hook Form + Zod для форм
- Импорты: `from app.dependencies import get_current_user`
- Токен в cookies: `access_token` (httpOnly, SameSite=lax, path=/)

## Output Format Rules (for LLM)

- Возвращать полные файлы, не diffs
- Включать все импорты
- Без TODO-комментариев и заглушек
- Следовать Output и Done-when из каждой task card

## Error Handling Convention

- Все ошибки аутентификации возвращают 401 "Incorrect username or password" (без раскрытия информации)
- Pydantic валидация для входных данных
- HTTPException с detail для API ошибок

## Environment Variables

```
SECRET_KEY=changeme-generate-random-string-64-chars  # ДОЛЖЕН быть изменён в production
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
COOKIE_SECURE=false  # автоматически true в production
APP_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:80
LOGIN_RATE_LIMIT=3
LOGIN_MAX_FAILED_ATTEMPTS=5
LOGIN_LOCKOUT_MINUTES=15
```

## Порядок выполнения

1. **Волна 1** (все независимые, можно параллельно):
   - L6-01: Валидация secret_key
   - L6-02: max_length в LoginRequest
   - L6-03: Логирование user_id вместо токена
   - L6-04: cookie_secure warning
   - L6-05: console.warn в production
   - L6-06: Workbox exclude /api/auth
   - L6-07: Уменьшить rate limit
   - L4-01: SameSite → lax
   - L3-01: Убрать access_token из TokenResponse
   - L1-01: Поля блокировки в User

2. **Волна 2** (после волны 1):
   - L3-02: Обновить login/refresh endpoints (после L3-01)
   - L4-02: cookie-first get_current_user (после L4-01)
   - L2-01: Логика блокировки login (после L1-01)

3. **Волна 3** (после волны 2):
   - L4-03: Удалить SSETokenMiddleware + обновить sse.py (после L4-02)
   - L5-01: sseManager без token (после L4-03)
   - L5-02: httpClient credentials (после L3-02)

4. **Волна 4** (после волны 3):
   - L5-03: authStore без accessToken (после L3-02, L5-02)
   - L7-01: Обновить backend тесты (после L3-02, L4-02)

5. **Волна 5** (после волны 4):
   - L5-04: Восстановление сессии (после L5-03)

6. **Финал:**
   - L8-01: Обновить features.md (после всех)

## Связанные документы

- `docs/plans/security/2026-04-21-security-fix.md` — полный план
- `docs/plans/security/2026-04-21-security-fix-critique.md` — критический разбор #1
- `docs/plans/security/2026-04-21-security-fix-critique-r2.md` — критический разбор #2
