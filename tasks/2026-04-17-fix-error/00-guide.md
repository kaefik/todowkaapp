# Execution Guide — TodoWka Error Fixes
Generated: 2026-04-17

## Project Context
Исправление критических ошибок в существующем приложении TodoWka: проблема с IndexedDB (несовместимость схемы), ошибки авторизации API и SSE (401), бесконечный цикл переподключений SSE.

## Tech Stack
- Backend: Python 3.12+ with FastAPI, SQLAlchemy 2.0, SQLite
- Frontend: React 18+ with TypeScript, Vite 8.0.5, TanStack Query
- DB: SQLite с aiosqlite, IndexedDB (для кэша на клиенте)
- Auth: JWT с cookie-based storage + Authorization header fallback
- Testing: pytest (backend), Vitest (frontend)
- Observability: console.log, browser DevTools

## Execution Style
execution_style: careful
# careful = small steps, verify each output before proceeding

## Code Conventions
- Backend: Python type hints, async/await, Pydantic v2
- Frontend: TypeScript, React hooks, Zustand stores
- Именование: snake_case для backend, camelCase для frontend
- Структура: слоистая архитектура (API → Services → Models)

## Output Format Rules (for LLM)
- Всегда возвращать полные файлы, а не diff'ы или частичный код
- Всегда включать все imports
- Нет TODO комментариев, нет плейсхолдеров
- Следовать точному Output и Done-when из каждой карточки задачи

## Error Handling Convention
- Backend: возвращать HTTPException с детальным сообщением
- Frontend: try-catch с логированием в console.error
- Критические ошибки: показывать toast уведомления пользователю
- SSE ошибки: логировать и останавливать переподключения после N попыток

## Environment Variables
Backend:
- `APP_ENV=development` или `production`
- `SECRET_KEY` - для JWT подписи
- `ACCESS_TOKEN_EXPIRE_MINUTES=30`
- `ALGORITHM=HS256`

Frontend:
- `VITE_API_URL=http://localhost:8000`
- `MODE=development` (автоматически устанавливается Vite)
