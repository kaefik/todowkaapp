### L8-29 — Финальная верификация: lint + typecheck

**Goal:** Запустить все проверки качества кода и убедиться что всё проходит.

**Input:** Весь реализованный код итерации 4.

**Output:** Результаты проверок.

**Done when:** Все линтеры и проверки типов проходят без ошибок.

**Acceptance criteria:**
- [ ] `cd backend && ruff check .` — 0 ошибок
- [ ] `cd frontend && npm run lint` — 0 ошибок
- [ ] `cd frontend && npx tsc --noEmit` — 0 ошибок
- [ ] `cd backend && pytest tests/ -v` — все тесты проходят
- [ ] Миграции: `alembic upgrade head` — без ошибок

**depends_on:** [all]

**impact:** 3 | **complexity:** 1 | **risk:** 1
**priority_score:** 4.0
**Est. effort:** S (~1h)
