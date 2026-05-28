### L7-05 — Тесты: X-Forwarded-For и rate limiting

**Goal:** Тест что X-Forwarded-For спуфинг не обходит rate limit.
**Input:** Исправленная get_client_ip.
**Output:** Тесты.
**Acceptance criteria:**
- [ ] Тест: прямой запрос → rate limit по client.host
- [ ] Тест: X-Forwarded-For с доверенным прокси → последний IP
- [ ] Тест: X-Forwarded-For без доверенного прокси → client.host
- [ ] Тест: spoofed X-Forwarded-For → не обходится
**depends_on:** [L4/01]
**impact:** 4
**complexity:** 1
**risk:** 1
**priority_score:** 9.0
**Est. effort:** XS
