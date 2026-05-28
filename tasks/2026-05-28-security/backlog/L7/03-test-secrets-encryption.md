### L7-03 — Тесты: Шифрование секретов в БД

**Goal:** Тест что секреты хранятся зашифрованными.
**Input:** CryptoService, модели.
**Output:** Тесты encrypt/decrypt, migration.
**Acceptance criteria:**
- [ ] Тест round-trip encrypt→decrypt
- [ ] Тест что в БД значение ≠ plaintext
- [ ] Тест migration plaintext→encrypted
- [ ] Тест backward compatibility без encryption key
**depends_on:** [L2/02, L4/03]
**impact:** 4
**complexity:** 1
**risk:** 1
**priority_score:** 9.0
**Est. effort:** XS
