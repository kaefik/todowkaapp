### L1-03 — User: поля last_review_at и review_count

**Goal:** Добавить в модель User два поля для отслеживания weekly review.

**Input:** Текущая модель User (`backend/app/models/user.py`).

**Output:** Обновлённая модель User + Alembic миграция.

**Done when:** Новые колонки существуют в БД после миграции.

**Acceptance criteria:**
- [ ] `last_review_at: Mapped[datetime | None]` — nullable, default=None
- [ ] `review_count: Mapped[int]` — default=0
- [ ] Alembic миграция с upgrade/downgrade
- [ ] Существующие записи User получают review_count=0, last_review_at=NULL

**depends_on:** []

**impact:** 3 | **complexity:** 1 | **risk:** 1
**priority_score:** 7.5
**Est. effort:** XS (~30min)
