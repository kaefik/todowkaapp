# План исправления уязвимостей бекенда

**Дата:** 2026-05-28
**Тип:** Security Audit Remediation
**Версия:** 4.0 (финальная, после трёх раундов критического разбора)

---

## Epic: Telegram Auth — полностью сломанная фича

Весь Telegram-авторизация **неработоспособна**: нет HMAC-верификации, типы сломаны, ID конвертация крашится, нет rate limiting. Все Telegram-находки сгруппированы как единый epic для исправления.

### T-01. Нет HMAC-верификации initData (CRITICAL)

**Файл:** `backend/app/services/telegram_auth_service.py:19`
**Категория:** Обход авторизации

`validate_init_data` проверяет данные через API-вызов `respondWebAppQuery`, а не через HMAC-SHA256 подпись. Позволяет подделать `user_id`.

**Важно:** `_parse_init_data` (строка 60-62) конвертирует `user` из JSON-строки в dict. Для HMAC-проверки нужны **исходные строковые значения** из query string. Нельзя использовать `_parse_init_data` для HMAC.

**Исправление:**

```python
def _validate_hash(self, init_data: str) -> bool:
    params = {}
    for item in init_data.split("&"):
        if "=" in item:
            key, value = item.split("=", 1)
            params[key] = value  # RAW string, БЕЗ json.loads

    hash_value = params.pop("hash", "")
    if not hash_value:
        return False

    data_check = "\n".join(f"{k}={v}" for k, v in sorted(params.items()))
    secret_key = hmac.new(
        "WebAppData".encode(), self.bot_token.encode(), hashlib.sha256
    ).digest()
    computed = hmac.new(
        secret_key, data_check.encode(), hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(computed, hash_value)
```

Порядок: сначала HMAC-проверка через raw query string → потом `_parse_init_data` для извлечения данных.

Дополнительно: проверить `auth_date` на свежесть (не старше 5 минут).

---

### T-02. Токены Telegram возвращаются в JSON (CRITICAL)

**Файл:** `backend/app/api/telegram_auth.py:28`
**Категория:** Утечка данных

`access_token` и `refresh_token` в теле ответа, а не в HttpOnly cookies.

**Контекст:** Telegram Mini App в WebView — HttpOnly cookies могут не работать (cross-origin, `SameSite` ограничения).

**Решение:** Не возвращать `refresh_token` в теле. Возвращать только короткоживущий `access_token` (5 мин). `create_access_token` уже поддерживает `expires_delta`:

```python
access_token = create_access_token(
    data={"sub": str(user.id)},
    expires_delta=timedelta(minutes=5)
)
```

Каждый логин через Telegram требует свежего initData (HMAC-валидированного через T-01), что делает долгоживущие refresh-токены избыточными. Если cookies с `SameSite=None; Secure` работают в WebView — использовать их как альтернативу.

---

### T-03. `int()` крашится на UUID (BUG)

**Файл:** `backend/app/api/telegram_auth.py:31`
**Категория:** Функциональный баг

```python
"id": int(user_model.id.replace("-", "")[:8]),
```

UUID содержит hex-буквы (a-f). `int("a1b2c3d4")` → `ValueError`. Эндпоинт крашится на любом реальном пользователе.

**Исправление:** Не делать lossy-конверсию. Обновить `UserResponse` в `schemas/telegram_auth.py:7`: `id: int` → `id: str`.

---

### T-04. User используется как dict (BUG)

**Файл:** `backend/app/api/telegram_auth.py:49,70`
**Категория:** Функциональный баг

`current_user: dict = Depends(get_current_user)` — но `get_current_user` возвращает `User`. Вызовы `current_user.get("id")`, `current_user["sub"]` → `AttributeError`/`TypeError`.

Дополнительно: `get_bind_link` (строка 73) создаёт `AsyncSessionLocal()` вручную вместо DI — потенциальная утечка соединений.

**Исправление:**
1. Изменить тип на `User`, использовать `str(current_user.id)`
2. `get_bind_link` — добавить `db: AsyncSession = Depends(get_db)` вместо `AsyncSessionLocal()`

---

### T-05. Нет rate limiting на telegram_auth (HIGH)

**Файл:** `backend/app/api/telegram_auth.py`
**Категория:** Обход защиты

Все 4 эндпоинта без `@limiter.limit`. `/telegram/login` — unauthenticated + внешний HTTP-вызов на каждый запрос. Вектор SSRF/amplification/DoS.

**Исправление:** SlowAPI требует параметр `request: Request`. Текущий код использует `request: TelegramLoginRequest` — нужно переименовать в `data` (как в `auth.py:118-121`):

```python
@router.post("/login", response_model=TelegramLoginResponse)
@limiter.limit("5/minute")
async def telegram_login(
    request: Request,                    # Для slowapi
    data: TelegramLoginRequest,          # Pydantic body (переименован)
    db: AsyncSession = Depends(get_db)
):

@router.post("/bind", response_model=TelegramBindResponse)
@limiter.limit(write_limit)
async def bind_telegram(
    request: Request,
    current_user: User = Depends(get_current_user),
    data: TelegramBindRequest = None,    # Pydantic body
    db: AsyncSession = Depends(get_db)
):

@router.get("/bind-link")
@limiter.limit(read_limit)
async def get_bind_link(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),  # Через DI, не AsyncSessionLocal
):
```

Все обращения `request.init_data` → `data.init_data`, `request.token` → `data.token`.

---

### T-06. init_data без ограничения длины (MEDIUM)

**Файл:** `backend/app/schemas/telegram_auth.py:16`
**Категория:** DoS

```python
init_data: str  # Без max_length
```

Combined с отсутствием rate limiting — отправка мегабайт на unauthenticated endpoint.

**Исправление:** `init_data: str = Field(max_length=4096)`

---

### T-07. telegram_logout — no-op (LOW)

**Файл:** `backend/app/api/telegram_auth.py:81-84`

Возвращает `{"success": True}` без инвалидации токенов или очистки cookies.

---

### T-08. token_type = "bearer" вводит в заблуждение (LOW)

**Файл:** `backend/app/schemas/telegram_auth.py:23`

`token_type: str = "bearer"` — приложение использует cookie-based auth. Убрать или не возвращать.

---

## CRITICAL (1)

### C-01. Смена пароля без подтверждения текущего

**Файл:** `backend/app/api/users.py:149`
**Категория:** Нарушение авторизации

`PATCH /users/me` позволяет сменить пароль без текущего. `/auth/change-password` правильно требует `current_password`.

**Влияние:** При угоне cookie злоумышленник может сменить пароль и полностью захватить аккаунт.

**Исправление:** Удалить поле `password` из `UserUpdate` — смена пароля только через `/auth/change-password`.

---

## HIGH (5)

### H-01. X-Forwarded-For спуфинг обходит rate limiting

**Файл:** `backend/app/rate_limit.py:8`, `backend/app/api/auth.py:38`
**Категория:** Обход защиты

`get_client_ip` дублирована в двух файлах, безусловно доверяет `X-Forwarded-For`. `auth.py:45` создаёт отдельный `Limiter` с отдельной конфигурацией.

**Исправление:**
1. Единую функцию в `rate_limit.py`, удалить дубликат из `auth.py`
2. Использовать последний IP в цепочке X-Forwarded-For (от доверенного прокси)
3. Конфигурация `TRUSTED_PROXIES` через env

---

### H-02. Секреты в БД без шифрования (SMTP + Telegram tokens)

**Файлы:** `backend/app/api/settings.py:80`, `backend/app/models/user.py:26`
**Категория:** Утечка секретов

SMTP-пароль в `system_settings` + `telegram_bot_token` каждого пользователя — всё в открытом виде.

Telegram bot tokens критичнее: один секрет на систему (SMTP) vs. по секрету на каждого пользователя.

**Исправление:** Шифровать Fernet с ключом из env (`SECRETS_ENCRYPTION_KEY`). Единая стратегия для всех секретов.

**Миграция данных:** При первом запуске с `SECRETS_ENCRYPTION_KEY` — прочитать все plaintext-значения, зашифровать, записать обратно. Добавить флаг `secrets_encrypted` в `system_settings` для отслеживания статуса. Для `telegram_bot_token` — шифровать/дешифровать прозрачно через property в модели User или через сервисный слой.

---

### H-03. Слабый генератор кода верификации email

**Файл:** `backend/app/api/users.py:237`
**Категория:** Криптография

```python
code = "".join(random.choices(string.digits, k=6))  # random — не CSPRNG
```

**Исправление:**

```python
import secrets
code = "".join(secrets.choice(string.digits) for _ in range(6))
```

---

### H-04. Нет защиты от перебора кода верификации email

**Файл:** `backend/app/api/users.py:260`
**Категория:** Brute Force

`/confirm-email` ограничен общим rate limit (20/мин). Нет отдельного лимита, нет инвалидации после неудачных попыток.

**Исправление:**
1. Отдельный rate limit (5/мин)
2. Инвалидация кода после 5 неудачных попыток
3. Server-side срок действия (связано с M-06)

---

### H-05. python-jose — неподдерживаемая библиотека

**Файл:** `backend/pyproject.toml:17`
**Категория:** Зависимости

`python-jose` не обновляется с 2023 года. Нет активных мейнтейнеров — потенциальные CVE без патчей. Код использует только HS256 — известные CVE (algorithm confusion) не эксплойтабельны, но отсутствие поддержки критично.

**Влияние:** Вся аутентификация на этой библиотеке.

**Исправление:** Миграция на `PyJWT`:
- `from jose import jwt` → `import jwt`
- `from jose import JWTError` → `from jwt.exceptions import InvalidTokenError`
- API `encode/decode` совпадает
- Существующие токены (HS256) совместимы — миграция прозрачна
- Обновить `pyproject.toml`: заменить `python-jose[cryptography]` на `PyJWT`

---

## MEDIUM (9)

### M-01. Неограниченный кэш HIBP — DoS через память

**Файл:** `backend/app/services/hibp.py:9`

`_range_cache` без ограничения размера. Trigger при регистрации (rate-limited), но теоретический рост.

**Исправление:** Добавить `maxsize` (100 записей).

---

### M-02. Таблица revoked_tokens растет бесконечно

**Файл:** `backend/app/models/revoked_token.py`

**Исправление:** Периодическая очистка через APScheduler (уже есть в проекте).

---

### M-03. Заблокированный пользователь активен до 15 мин

**Файл:** `backend/app/dependencies.py:62`

Стандартный компромисс JWT. Для критичных сценариев — уменьшить TTL до 5 мин.

---

### M-04. Нет заголовка Strict-Transport-Security (HSTS)

**Файл:** `backend/app/main.py:70`

**Исправление:**

```python
if settings.app_env == "production":
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
```

---

### M-05. CSP содержит unsafe-inline для стилей

**Файл:** `backend/app/main.py:80`

Необходимо для Tailwind CSS. Nonce-based CSP требует интеграции с Vite.

---

### M-06. Нет server-side срока действия кода верификации email

**Файл:** `backend/app/models/user.py:36`

Нет `email_verification_code_expires_at`. Email упоминает "15 минут", сервер не проверяет.

**Исправление:** Добавить поле + миграция + проверка при подтверждении.

---

### M-07. Bare except в telegram_auth_service

**Файл:** `backend/app/services/telegram_auth_service.py:48,65`

Два места: `except Exception as e: pass` (строка 48) и `except: return None` (строка 65).

**Исправление:** `except Exception` + логирование.

---

### M-08. Email/Username enumeration при регистрации

**Файл:** `backend/app/api/auth.py:79-91`

Разные сообщения для username/email. Timing-атака: проверки выполняются последовательно, разное время ответа.

**Исправление:**
1. Единое сообщение: "Username or email already exists"
2. Выполнять оба запроса всегда (устранить timing)

---

### M-09. Race condition при параллельном импорте

**Файл:** `backend/app/services/export_import_service.py:256`

Маловероятно для персонального todo-приложения.

**Исправление:** Сериализуемый уровень изоляции или блокировка по user_id.

---

## LOW (7)

| # | Проблема | Файл |
|---|----------|------|
| L-01 | Swagger UI доступен в продакшене (`/docs`, `/openapi.json`) | `main.py:60` |
| L-02 | Код верификации email не зашифрован в БД | `user.py:36` |
| L-03 | Лишняя зависимость `passlib` (используется `bcrypt` напрямую) | `pyproject.toml:19` |
| L-04 | Частичный показ telegram bot token (последние 5 символов) | `schemas/user.py:53` |
| L-05 | CSP `unsafe-inline` + CORS `allow_headers=["*"]` | `main.py:80,92` |
| L-06 | Раскрытие списка эндпоинтов в корневом ответе API | `router.py:15` |
| L-07 | Нет rate limiting на эндпоинтах `/sessions` | `sessions.py` |

---

## Приоритет исправления

### Epic: Telegram Auth (P0) — исправлять как единое целое

Все находки T-01..T-08 взаимосвязаны — фича полностью сломана.

1. **T-01** — HMAC-верификация (raw query string, НЕ `_parse_init_data`)
2. **T-03** — Убрать `int()` конверсию UUID
3. **T-04** — Исправить типы + DI в `get_bind_link`
4. **T-05** — Добавить rate limiting (переименовать `request` → `data` для Pydantic body)
5. **T-02** — Убрать refresh_token, только короткоживущий access_token через `expires_delta=timedelta(minutes=5)`
6. **T-06** — `init_data` max_length=4096
7. **T-07** — Реализовать logout (инвалидация + cookies)
8. **T-08** — Убрать `token_type: "bearer"`

### P0 (немедленно)

9. **C-01** — Удалить `password` из `UserUpdate`

### P1 (срочно)

10. **H-01** — X-Forwarded-For спуфинг + устранение дублирования
11. **H-05** — Миграция python-jose → PyJWT
12. **H-02** — Шифрование секретов в БД + миграция plaintext → encrypted
13. **H-03** — `random` → `secrets`
14. **H-04** — Защита от перебора кода email

### P2 (ближайший спринт)

15. **M-01–M-09** — Все medium
16. **L-01–L-07** — Все low

---

## Стратегия тестирования

Для каждого исправления:
1. Написать тест, воспроизводящий уязвимость (красный)
2. Применить исправление
3. Проверить что тест проходит (зелёный)
4. Запустить полный набор тестов — нет регрессии
5. При изменении моделей БД — создать миграцию, проверить на существующих данных

Для Telegram Auth epic: написать интеграционный тест полного флоя (HMAC → login → token → authenticated request).

---

## Что сделано хорошо

- HttpOnly + Secure + SameSite cookies для токенов (основной логин)
- bcrypt с rounds=12 + автоматический rehash
- Ротация refresh-токенов с JTI-ревокацией
- Проверка password_changed_at при refresh
- Account lockout после неудачных попыток логина
- Security headers (X-Frame-Options, X-Content-Type-Options, CSP, Referrer-Policy, Permissions-Policy)
- Rate limiting на большинстве эндпоинтов
- Проверка HIBP для паролей (опционально)
- SQLAlchemy ORM (защита от SQL-инъекций)
- Pydantic валидация всех входных данных
- Валидация пароля (длина, цифры, верхний регистр, спецсимволы)
- Admin-first-user политика
- Валидация secret_key в production
- Проверка ownership в SessionService (строка 66: `Session.user_id == user_id`)
- Валидация `limit` в задачах: `Query(ge=1, le=100)` (`tasks.py:80`)
