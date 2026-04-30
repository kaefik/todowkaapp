### L3-10 — Rate limiting: применить к роутерам

**Goal:** Применить rate limiting декораторы ко всем API роутерам согласно категориям.

**Input:** `backend/app/rate_limit.py` (L2-06). Существующие роутеры.

**Output:** Обновлённые роутеры с `@limiter.limit(...)` декораторами.

**Done when:** Все эндпоинты покрыты rate limiting.

**Acceptance criteria:**
- [ ] Auth роутеры: login/register уже имеют лимиты (проверить, не дублировать)
- [ ] Write операции (tasks, projects, areas, contexts, tags, verb_templates, checklist, backup_schedules): `@limiter.limit(settings.rate_limit_write)` на POST/PUT/PATCH/DELETE
- [ ] Read операции: `@limiter.limit(settings.rate_limit_read)` на GET
- [ ] SSE: `@limiter.limit(settings.rate_limit_sse)` на `/api/sse/*`
- [ ] Export/Import: `@limiter.limit(settings.rate_limit_export)`
- [ ] 429 ответ корректно обрабатывается (существующий handler)
- [ ] Публичные endpoints (health, /) не требуют авторизации но имеют IP-based лимит

**depends_on:** [L2-06]

**impact:** 3 | **complexity:** 2 | **risk:** 1
**priority_score:** 6.0
**Est. effort:** S (~1h)
