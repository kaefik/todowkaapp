# Execution Guide — Notification Fix

**Generated:** 2026-04-20

## Project Context

Bug fix для системы уведомлений в веб-приложении Todowka. Проблема: напоминания не отображаются корректно пользователю (browser notifications не показываются, SSE падает без fallback, handler зависит от store).

## Tech Stack

- **Frontend:** React 18+ with TypeScript, Vite, Zustand
- **Backend:** FastAPI with Python, SQLAlchemy 2.0 (async), SQLite
- **Real-time:** Server-Sent Events (SSE), Event Bus
- **Logging:** console.log (diagnostic logging)
- **Browser API:** Notification API, Custom Events

## Execution Style

```
execution_style: careful
# careful = small steps, verify each output before proceeding
```

## Code Conventions

- **Naming:** camelCase for JS/TS, snake_case for Python
- **File Structure:** `frontend/src/{components,stores,services,utils}`, `backend/app/{api,services,models}`
- **Import/Export:** ES modules in frontend, Python imports in backend
- **Logging Prefixes:** `[ComponentName]` or `[ModuleName]` for easy filtering
- **Error Handling:** try-catch with console.error, graceful degradation

## Output Format Rules (for LLM)

- Always return complete files, never diffs or partial code
- Always include all imports
- No TODO comments, no placeholders
- Follow the exact Output and Done-when from each task card
- Preserve existing code structure and formatting

## Error Handling Convention

- **Frontend:** try-catch with console.error, fallback to toast
- **Backend:** try-except with logger.error, return appropriate status codes
- **SSE:** onError handler with polling fallback, onOpen with polling stop
- **Browser Notifications:** Feature detection, graceful degradation to toast

## Environment Variables

- `VITE_API_URL` - API base URL
- `DATABASE_URL` - SQLite database path
- `SECRET_KEY` - JWT secret key

## Task Execution Order

Follow this priority order (not layer order):
1. L1-01: Backend event_bus fix (foundation for frontend)
2. L6-01: SSE error handling (prerequisite for polling)
3. L5-01: Polling fallback (depends on L6-01)
4. L5-02: SSE manager integration (depends on L5-01)
5. L6-02: NotificationProvider handler fix (depends on L1-01)
6. L9-01: Enhanced logging (cross-cutting, can be done anytime)
7. L7-01 through L7-06: Test cases (verify all fixes)

## Verification After Each Task

After completing each task:
1. Check console for expected log messages
2. Verify no TypeScript errors
3. Run `npm run lint` (frontend) or `ruff check` (backend)
4. Manual smoke test if applicable
