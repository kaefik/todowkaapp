### L7-07 — Тесты: Прочие security исправления

**Goal:** Тесты для оставшихся исправлений.
**Input:** Все исправления.
**Output:** Тесты.
**Acceptance criteria:**
- [ ] HIBP cache ограничен 100 → тест
- [ ] `secrets.choice` вместо `random.choices` → тест
- [ ] Email enumeration — одинаковое сообщение → тест
- [ ] HSTS заголовок в production → тест
- [ ] Swagger недоступен в production → тест
- [ ] init_data > 4096 → 422
**depends_on:** [L2/03, L2/04, L2/05, L5/01, L5/03, L5/04, L3/07]
**impact:** 4
**complexity:** 2
**risk:** 1
**priority_score:** 4.5
**Est. effort:** S
