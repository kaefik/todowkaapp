# 00-guide.md — Execution Guide

# Execution Guide — Todowka Iteration 4

Generated: 2026-04-29

## Project Context

Todowka — GTD-ориентированный таск-менеджер (personal SQLite app). Итерация 4 добавляет Weekly Review wizard, управление сессиями, анимации, SQL-индексы, rate limiting и security hardening.

## Tech Stack

- **Backend:** Python 3.12+, FastAPI, SQLAlchemy 2.0 (async), SQLite (aiosqlite), Alembic, Pydantic v2, JWT (python-jose), bcrypt, slowapi, APScheduler
- **Frontend:** React 19, TypeScript, Vite 8, React Router v7, Zustand, React Hook Form + Zod, Tailwind CSS 4
- **Auth:** JWT httpOnly cookies (access 15 мин, refresh 7 дней), refresh token rotation

## Execution Style

execution_style: careful

## Code Conventions

- Backend: async/await, слоистая архитектура (API → Services → Models), Pydantic v2, Ruff
- Frontend: TypeScript strict, Zustand, Tailwind CSS 4, i18n (react-i18next)
- Без комментариев в коде
- Русский язык в UI

## Output Format Rules

- Полные файлы, никогда diff
- Все импорты включены
- Никаких TODO / плейсхолдеров

## Environment Variables

Новые: `RATE_LIMIT_WRITE`, `RATE_LIMIT_READ`, `RATE_LIMIT_SSE`, `RATE_LIMIT_EXPORT`

## Summary

| # | Layer | Task | Score | Effort | Depends on |
|---|-------|------|-------|--------|------------|
| 01 | L1 | SQL-индексы: миграция + модели | 9.0 | S | — |
| 02 | L1 | Модель Session: миграция + ORM | 8.0 | S | — |
| 03 | L1 | User: поля last_review_at, review_count | 7.5 | XS | — |
| 04 | L2 | SessionService | 7.5 | M | 02 |
| 05 | L2 | ReviewService | 7.0 | M | 03 |
| 06 | L2 | Rate limiting config | 6.0 | S | — |
| 07 | L2 | RevokedToken cleanup job | 5.0 | S | — |
| 08 | L3 | Session API endpoints | 7.5 | S | 04 |
| 09 | L3 | Review API endpoints | 7.0 | S | 05 |
| 10 | L3 | Rate limiting: apply to routers | 6.0 | S | 06 |
| 11 | L3 | Auth integration: session tracking | 8.0 | M | 04, 08 |
| 12 | L4 | Security headers middleware | 5.0 | S | — |
| 13 | L4 | Security audit: code review | 4.0 | M | 10, 11, 12 |
| 14 | L5 | Frontend: session_id в authStore | 7.5 | XS | 11 |
| 15 | L5 | Frontend: session components + API | 7.5 | M | 14 |
| 16 | L5 | Frontend: session UI в Settings Security | 7.0 | M | 15 |
| 17 | L5 | Frontend: Review wizard route + layout | 7.0 | S | 09 |
| 18 | L5 | Frontend: ReviewInbox step | 7.5 | M | 17 |
| 19 | L5 | Frontend: ReviewProjects step | 6.5 | S | 17 |
| 20 | L5 | Frontend: ReviewSomeday step | 6.5 | S | 17 |
| 21 | L5 | Frontend: Review completion + stats | 6.0 | S | 18, 19, 20 |
| 22 | L5 | Frontend: review reminder banner | 5.0 | S | 21 |
| 23 | L6 | CSS animations: keyframes + utilities | 5.0 | S | — |
| 24 | L6 | Modal animations | 4.5 | S | 23 |
| 25 | L6 | List + sidebar animations | 4.0 | S | 23 |
| 26 | L6 | View Transitions API wrapper | 3.5 | S | 23 |
| 27 | L7 | Backend tests: Session + Review | 5.0 | M | 11, 09 |
| 28 | L8 | Update features.md | 3.0 | XS | all |
| 29 | L8 | Final lint + typecheck verification | 4.0 | S | all |
