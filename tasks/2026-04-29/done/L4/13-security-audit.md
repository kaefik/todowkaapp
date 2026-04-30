### L4-13 — Security audit: код-ревью

**Goal:** Провести структурированный аудит безопасности кодовой базы.

**Input:** Весь backend + frontend код. Результаты pip audit / npm audit.

**Output:** Отчёт с найденными проблемами + фиксы.

**Done when:** Все чеклисты пройдены, критические проблемы исправлены.

**Acceptance criteria:**
- [ ] Все API endpoints используют `Depends(get_current_user)` (нет «голых» роутеров кроме health и auth публичных)
- [ ] SQL injection: все запросы через SQLAlchemy ORM (нет raw SQL)
- [ ] XSS: нет использования `dangerouslySetInnerHTML`
- [ ] Error responses не содержат stack traces, путей файловой системы, SQL запросов
- [ ] JWT secret берётся из env (не хардкод)
- [ ] Алгоритм HS256 (не none)
- [ ] Access token expiry = 15 мин, refresh = 7 дней
- [ ] Cookie: httpOnly=True, Secure в production, SameSite=lax
- [ ] Pydantic схемы валидируют все input
- [ ] Pagination: лимит на page size (проверить)
- [ ] `pip audit` — нет критических CVE
- [ ] `npm audit` — нет критических CVE

**depends_on:** [L3-10, L3-11, L4-12]

**impact:** 3 | **complexity:** 3 | **risk:** 2
**priority_score:** 4.0
**Est. effort:** M (~2h)
