### L2-06 — Race condition при параллельном импорте (M-09)

**Goal:** Добавить защиту от параллельного импорта данных одним пользователем.
**Input:** `backend/app/services/export_import_service.py:256`.
**Output:** Сериализация импорта по user_id.
**Done when:** Параллельный импорт не создаёт дубликатов.
**Acceptance criteria:**
- [ ] Lock по user_id в начале импорта
- [ ] Параллельный запрос получает 409 Conflict или ждёт
- [ ] Существующий импорт не сломан
**depends_on:** []
**impact:** 2
**complexity:** 3
**risk:** 2
**priority_score:** 2.0
**Est. effort:** S
