### L2-02 — Сервис шифрования секретов Fernet (H-02 foundation)

**Goal:** Создать утилитарный модуль для шифрования/дешифрования секретей через Fernet.
**Input:** `SECRETS_ENCRYPTION_KEY` из config.
**Output:** `backend/app/services/crypto_service.py` с encrypt/decrypt.
**Done when:** Сервис шифрует/дешифрует строки, миграция plaintext→encrypted возможна.
**Acceptance criteria:**
- [ ] `CryptoService` с методами `encrypt(plaintext: str) -> str` и `decrypt(ciphertext: str) -> str`
- [ ] Использует `cryptography.fernet.Fernet` с ключом из `settings.secrets_encryption_key`
- [ ] Если ключ не задан — возвращает plaintext (backward compatible)
- [ ] `cryptography` добавлена в pyproject.toml
- [ ] Unit-тесты encrypt/decrypt round-trip
- [ ] Unit-тест на missing key (no-op behavior)
**depends_on:** [L0/02]
**impact:** 5
**complexity:** 2
**risk:** 3
**priority_score:** 6.5
**Est. effort:** S
