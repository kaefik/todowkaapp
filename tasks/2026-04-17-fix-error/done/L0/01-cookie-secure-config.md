### L0-01 — Добавить настройку cookie_secure в конфигурацию backend

**Goal:** Добавить параметр конфигурации для управления флагом secure cookie в зависимости от окружения (dev/prod).
**Input:** Файл `backend/app/config.py`
**Output:** Обновленный `backend/app/config.py` с новым параметром `cookie_secure`
**Done when:** Параметр `cookie_secure` добавлен в Settings класс, возвращает False для development, True для production.
**Acceptance criteria:**
- [ ] В Settings класс добавлен параметр `cookie_secure: bool = False` по умолчанию
- [ ] Параметр автоматически устанавливается в `True` если `app_env == "production"`
- [ ] Параметр можно переопределить через переменную окружения `COOKIE_SECURE`
**depends_on:** []
**impact:** 3 (влияет на авторизацию SSE)
**complexity:** 1 (тривиально)
**risk:** 1 (безопасно)
**priority_score:** (3 × 2 + 1) / 1 = 7.0
**Est. effort:** XS (30 min)
**LLM Prompt Hint:** Добавьте поле `cookie_secure: bool = False` в класс Settings в backend/app/config.py. Используйте @field_validator для установки в True если app_env == "production". Разрешите переопределение через переменную окружения.
