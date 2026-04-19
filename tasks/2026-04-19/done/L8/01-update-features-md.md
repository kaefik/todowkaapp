### L8/01 — Обновить docs/features.md

**Goal:** Обновить файл документации возможностей в соответствии с исправлениями системы напоминаний.

**Input:**
- Все выполненные задачи L1-L5
- Текущий файл: `docs/features.md`

**Output:**
- Обновлённый `docs/features.md`

**Done when:**
1. Добавлена/обновлена секция "Система напоминаний" с описанием исправлений

**Acceptance criteria:**
- [ ] Описаны оба режима напоминаний: reminder_time и reminder_offsets
- [ ] Упомянуто: множественные offsets работают независимо
- [ ] Упомянуто: SSE с бесконечным реконнектом и polling fallback
- [ ] Упомянуто: Recovery при перезапуске сервера

**depends_on:** [L2/01, L2/02, L2/04, L5/02, L5/03]
**impact:** 1
**complexity:** 1
**risk:** 1
**priority_score:** 3.0
**Est. effort:** XS
**type:** DOCS
