### L5-01 — Ограничить размер кэша HIBP (M-01)

**Goal:** Добавить maxsize для `_range_cache` чтобы предотвратить рост памяти.
**Input:** `backend/app/services/hibp.py:9`.
**Output:** Кэш ограничен 100 записями через OrderedDict или декоратор.
**Done when:** Кэш не растёт бесконечно.
**Acceptance criteria:**
- [ ] `_range_cache` ограничен 100 записями
- [ ] LRU-подобная стратегия вытеснения
- [ ] Существующая логика кэша сохранена
- [ ] Unit-тест на вытеснение
**depends_on:** []
**impact:** 3
**complexity:** 1
**risk:** 1
**priority_score:** 7.0
**Est. effort:** XS
