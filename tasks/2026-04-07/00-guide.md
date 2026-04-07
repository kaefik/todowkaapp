# Execution Guide — Todowka App (Iteration 1)
Generated: 2026-04-07

## Project Context
Todowka is a full-stack Todo application with user authentication, task management, and PWA capabilities. Built as a monorepo with FastAPI backend, React frontend, SQLite database, and Docker deployment. Iteration 1 implements core features: registration/login, JWT auth with refresh tokens, task CRUD operations, responsive UI, and basic PWA installation.

## Tech Stack
- Backend: Python 3.12, FastAPI, SQLAlchemy 2.0 (async), aiosqlite, Alembic, Pydantic v2
- Frontend: React 18, TypeScript, Vite, React Router v7, Zustand, Tailwind CSS, react-hook-form, zod
- Database: SQLite with WAL mode
- Auth: JWT (access token in memory, refresh token in HttpOnly cookie), bcrypt password hashing
- Testing: Backend (pytest + httpx), Frontend (Vitest + React Testing Library)
- Deployment: Docker, Docker Compose, Nginx
- CI/CD: GitHub Actions (lint, test, build)
- PWA: vite-plugin-pwa, Workbox, manifest.json

## Execution Style
execution_style: careful
# careful = small steps, verify each output before proceeding
# aggressive = full speed, trust the plan

## Code Conventions
- Backend: snake_case for variables/functions, PascalCase for classes, async/await for all I/O
- Frontend: camelCase for variables/functions, PascalCase for components, TypeScript strict mode
- File structure: Follow the generated directory structure from task cards
- Imports: Absolute imports from app/ in backend, @/ alias in frontend (if configured)
- Error handling: Backend returns HTTPException with appropriate status codes, Frontend displays user-friendly messages

## Output Format Rules (for LLM)
- Always return complete files, never diffs or partial code
- Always include all imports
- No TODO comments, no placeholders
- Follow the exact Output and Done-when from each task card
- Verify that all acceptance criteria are met before marking task complete

## Error Handling Convention
- Backend: Use FastAPI's HTTPException for API errors. Return structured error responses: `{"detail": "error message"}`
- Frontend: HTTP client intercepts 401, attempts refresh, redirects to /login on failure. UI shows error messages from API responses.
- State management: Store error state in Zustand stores, display to user, clear on retry or success.

## Environment Variables

### Backend (.env)
```
DATABASE_URL=sqlite+aiosqlite:///./data/todowka.db
SECRET_KEY=changeme-generate-random-string-64-chars
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
REGISTRATION_ENABLED=true
# INVITE_CODE=optional-secret-code
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:80
APP_ENV=development
LOG_LEVEL=info
```

### Frontend (.env)
```
VITE_API_BASE_URL=/api
VITE_APP_NAME=Todowka
```

## Task Organization
Tasks are organized in Kanban structure:
- L0: Foundation (project setup, Docker, CI)
- L1: Data Layer (models, migrations)
- L2: Core Business (services)
- L3: API / Interface (schemas, endpoints)
- L4: Auth & Security (JWT, password hashing, dependencies)
- L7: Tests (backend and frontend tests)
- L8: Docs & Deployment (README, .env.example)
- FE-Auth: Frontend authentication (store, pages, HTTP client)
- FE-Tasks: Frontend tasks (hooks)
- FE-UI: Frontend UI components
- FE-PWA: PWA configuration
- FE-Tests: Frontend tests

## Dependency Notes
- Backend must be set up (L0, L1, L2, L3, L4) before frontend can integrate (FE-Auth, FE-Tasks)
- Frontend depends on backend API endpoints being implemented
- Tests (L7, FE-Tests) depend on features being implemented
- Documentation (L8) should be done at the end
- Docker configuration (L0) should be done early but verified at the end

## Verification Commands
- Backend lint: `ruff check backend/`
- Backend test: `pytest backend/tests/`
- Frontend lint: `eslint frontend/src/`
- Frontend typecheck: `tsc --noEmit -p frontend/`
- Frontend test: `vitest frontend/`
- Frontend build: `npm run build` in frontend/
- Docker: `docker-compose up --build` in docker/
