# Task Summary — TodoWka Error Fixes
Generated: 2026-04-17

## Summary Table (sorted by priority_score desc within each layer)

| # | Layer | Task | Score | Effort | Depends on |
|---|-------|------|-------|--------|------------|
| 1 | Foundation | L0-01: Добавить настройку cookie_secure в конфигурацию backend | 7.0 | XS | — |
| 2 | Data Layer | L1-01: Изменить версию IndexedDB и добавить обработчик миграции | 4.33 | M | — |
| 3 | Core Business | L2-01: Добавить обертку с автоматическим сбросом кэша при ошибках | 6.0 | S | L1/01 |
| 4 | API / Interface | L3-01: Добавить расширенное логирование в get_current_user зависимость | 7.0 | XS | — |
| 5 | Auth & Security | L4-01: Реализовать условный secure для access_token cookie | 6.0 | S | L0/01 |
| 6 | Integration | L5-01: Проверить поддержку SSE в Vite proxy | 7.0 | S | — |
| 7 | Integration | L5-02: Реализовать fallback для SSE подключений | 6.0 | S | L4/01, L5/01 |
| 8 | Validation & Errors | L6-01: Добавить лимит переподключений SSE | 4.5 | S | L5/02 |
| 9 | Validation & Errors | L6-02: Добавить расширенную диагностику 401 ошибок на клиенте | 7.0 | XS | — |
| 10 | Tests | L7-01: Написать тест миграции IndexedDB | 2.33 | M | L1/01, L2/01 |
| 11 | Tests | L7-02: Написать тест авторизации API с cookie и header | 2.33 | M | L3/01, L4/01 |
| 12 | Tests | L7-03: Написать тест лимита переподключений SSE | 1.25 | L | L6/01 |
| 13 | Docs & Deployment | L8-01: Обновить README с инструкциями по исправлению ошибок | 5.0 | S | L1-L6 |
| 14 | Observability | L9-01: Добавить структурированное логирование SSE соединений | 2.5 | S | L5/02, L6/01 |
| 15 | Observability | L9-02: Добавить метрики состояния SSE соединения | 3.5 | S | L5/02, L6/01, L9/01 |

## Priority Ranking (top 10 by score across all layers, respecting depends_on)

### Batch 1: Start Immediately (no dependencies)

1. **L0-01** — Добавить настройку cookie_secure в конфигурацию backend (Score: 7.0, XS)
2. **L3-01** — Добавить расширенное логирование в get_current_user зависимость (Score: 7.0, XS)
3. **L5-01** — Проверить поддержку SSE в Vite proxy (Score: 7.0, S)
4. **L6-02** — Добавить расширенную диагностику 401 ошибок на клиенте (Score: 7.0, XS)
5. **L1-01** — Изменить версию IndexedDB и добавить обработчик миграции (Score: 4.33, M)

### Batch 2: After L0-01 and L1-01 complete

6. **L4-01** — Реализовать условный secure для access_token cookie (Score: 6.0, S) - depends on L0/01
7. **L2-01** — Добавить обертку с автоматическим сбросом кэша при ошибках (Score: 6.0, S) - depends on L1/01

### Batch 3: After L4-01, L5-01 complete

8. **L5-02** — Реализовать fallback для SSE подключений (Score: 6.0, S) - depends on L4/01, L5/01

### Batch 4: After L5-02 complete

9. **L6-01** — Добавить лимит переподключений SSE (Score: 4.5, S) - depends on L5/02

### Batch 5: After L6-01, L9/01 complete

10. **L9-02** — Добавить метрики состояния SSE соединения (Score: 3.5, S) - depends on L5/02, L6/01, L9/01

## Additional Tasks (lower priority)

11. **L8-01** — Обновить README с инструкциями по исправлению ошибок (Score: 5.0, S) - depends on L1-L6
12. **L9-01** — Добавить структурированное логирование SSE соединений (Score: 2.5, S) - depends on L5/02, L6/01
13. **L7-01** — Написать тест миграции IndexedDB (Score: 2.33, M) - depends on L1/01, L2/01
14. **L7-02** — Написать тест авторизации API с cookie и header (Score: 2.33, M) - depends on L3/01, L4/01
15. **L7-03** — Написать тест лимита переподключений SSE (Score: 1.25, L) - depends on L6/01

## Execution Order Recommendation

### Phase 1: Critical Fixes (Day 1)
- Batch 1: L0-01, L3-01, L5-01, L6-02, L1-01
- Batch 2: L4-01, L2-01

### Phase 2: SSE Integration (Day 2)
- Batch 3: L5-02
- Batch 4: L6-01

### Phase 3: Observability & UX (Day 3)
- L9-01
- L9-02
- L8-01

### Phase 4: Testing (Day 4)
- L7-01
- L7-02
- L7-03

## Notes

- **L7-03** marked with WARNING: complexity is L (4h) due to EventSource mocking. Consider simplifying or splitting.
- **Total estimated effort**: ~15-20 hours across all tasks
- **Critical path for fixing 401 errors**: L0-01 → L4-01 → L5-01 → L5-02 → L6-01
- **Critical path for fixing IndexedDB**: L1-01 → L2-01
