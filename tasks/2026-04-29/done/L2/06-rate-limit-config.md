### L2-06 — Rate limiting конфигурация

**Goal:** Создать модуль rate_limit.py с конфигурацией лимитов для разных категорий эндпоинтов.

**Input:** Существующий slowapi limiter в `main.py`. Config из `backend/app/config.py`.

**Output:** `backend/app/rate_limit.py`. Обновлённый `config.py` с новыми переменными.

**Done when:** Модуль экспортирует готовые к применению лимиты.

**Acceptance criteria:**
- [ ] Файл `backend/app/rate_limit.py` экспортирует: `rate_limit_write`, `rate_limit_read`, `rate_limit_sse`, `rate_limit_export`
- [ ] Config.py дополнен: `rate_limit_write: str = "20/minute"`, `rate_limit_read: str = "60/minute"`, `rate_limit_sse: str = "5/minute"`, `rate_limit_export: str = "5/minute"`
- [ ] `.env.example` обновлён с новыми переменными
- [ ] Использует существующий `limiter` из `app.state.limiter` (или реэкспортирует)
- [ ] Функция `get_limiter()` для получения экземпляра

**depends_on:** []

**impact:** 3 | **complexity:** 1 | **risk:** 1
**priority_score:** 6.0
**Est. effort:** S (~1h)
