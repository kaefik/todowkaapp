# Execution Guide — Security Remediation Backend
Generated: 2026-05-28

## Project Context
Исправление уязвимостей бекенда Todowka: полный ремонт Telegram-авторизации (HMAC, типы, rate limiting), миграция python-jose → PyJWT, шифрование секретов в БД, устранение критических багов и средних уязвимостей. Все исправления основаны на финальном аудите v4.0.

## Tech Stack
- Language: Python 3.12+ (async/await)
- Framework: FastAPI
- DB: SQLite + aiosqlite + SQLAlchemy 2.0 async
- Auth: JWT (HS256), bcrypt, HttpOnly cookies
- Testing: pytest + pytest-asyncio
- Linting: ruff
- Migrations: Alembic

## Execution Style
execution_style: careful
# Security-фиксы требуют аккуратности. Каждый шаг проверяется тестами.

## Code Conventions
- async/await везде
- Слоистая архитектура: API → Services → Models
- Pydantic v2 схемы для валидации
- SQLAlchemy 2.0 mapped_column стиль
- Type hints для всех функций
- ruff line-length=100

## Output Format Rules (for LLM)
- Always return complete files, never diffs or partial code
- Always include all imports
- No TODO comments, no placeholders
- Follow the exact Output and Done-when from each task card

## Error Handling Convention
- HTTPException с правильными status codes
- logger.warning/error для нештатных ситуаций
- Никаких bare except — всегда except Exception + логирование

## Environment Variables
- `SECRET_KEY` — JWT signing key (обязателен в production)
- `SECRETS_ENCRYPTION_KEY` — Fernet key для шифрования секретов в БД (новый, для H-02)
- `TRUSTED_PROXIES` — список доверенных прокси (новый, для H-01)
- `TELEGRAM_BOT_TOKEN` — токен Telegram бота
- `COOKIE_SECURE` — True в production
- `APP_ENV` — development/production
