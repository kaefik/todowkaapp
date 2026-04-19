# Execution Guide — Todowka Notification Fix v2

Generated: 2026-04-19

## Project Context

Исправление критических багов в системе напоминаний todowka-приложения: множественные reminder_offsets не работают (срабатывает только один), timezone-баг в клэмпинге, нет recovery при рестарте сервера, SSE обрывается после 5 попыток, нет polling fallback, EventBus теряет события. План охватывает 14 багов от критических до среднего приоритета.

## Tech Stack

- Language: Python 3.12+ (backend), TypeScript (frontend)
- Framework: FastAPI (backend), React 18+ (frontend)
- DB: SQLite + SQLAlchemy 2.0 async + Alembic
- Auth: JWT (cookie-based)
- Testing: pytest + pytest-asyncio (backend), vitest (frontend)
- Observability: logging (стандартный Python logging)

## Execution Style

execution_style: careful

Backend-задачи (L1-L3, L2) выполнять строго последовательно — каждая задача зависит от предыдущей. Frontend-задачи (L5) можно выполнять параллельно между собой. Тесты (L7) писать после соответствующих задач.

## Code Conventions

- Backend: async/await, типизация через type hints, слоистая архитектура API → Services → Models
- Frontend: TypeScript, Zustand для состояния, Tailwind CSS для стилей
- Модели SQLAlchemy 2.0: `Mapped[type]`, `mapped_column()`
- Pydantic v2: `BaseModel`, `model_config = {'from_attributes': True}`
- Imports: стандартные → сторонние → локальные

## Output Format Rules (for LLM)

- Always return complete files, never diffs or partial code
- Always include all imports
- No TODO comments, no placeholders
- Follow the exact Output and Done-when from each task card
- При редактировании файлов — использовать Edit tool, не переписывать файл целиком

## Error Handling Convention

- Backend: исключения с HTTP-кодами через FastAPI HTTPException
- Scheduler: try/except вокруг каждого таска, per-task commit/rollback
- Frontend: try/catch в stores, error state в Zustand

## Design Document

Полный план исправлений: `docs/plans/notifications/2026-04-19-notification-fix-v2.md`

## Key Files Reference

| Файл | Назначение |
|---|---|
| `backend/app/models/task.py` | SQLAlchemy модель Task |
| `backend/app/services/reminder_service.py` | Логика напоминаний |
| `backend/app/scheduler.py` | APScheduler jobs |
| `backend/app/services/task_service.py` | CRUD задач |
| `backend/app/schemas/task.py` | Pydantic-схемы |
| `backend/app/event_bus.py` | In-process pub/sub |
| `backend/app/api/sse.py` | SSE endpoint |
| `frontend/src/services/sseManager.ts` | SSE клиент |
| `frontend/src/stores/notificationStore.ts` | Zustand-стор уведомлений |
| `frontend/src/components/NotificationProvider.tsx` | Провайдер SSE + browser notifications |
| `frontend/src/components/ReminderEditor.tsx` | UI редактирования напоминаний |
| `frontend/src/utils/browserNotifications.ts` | Browser notification API |
