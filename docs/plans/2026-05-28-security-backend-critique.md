# Критический разбор v3: План исправления уязвимостей бекенда

**Дата:** 2026-05-28
**Целевой документ:** `docs/plans/2026-05-28-security-backend.md` (v3.0)
**Раунд:** 3

---

## Сводная таблица

| # | Lens | Проблема | Severity |
|---|------|----------|----------|
| 1 | Техническая | T-05 fix: конфликт имён `request` — slowapi и Pydantic body | 🟡 WARNING |
| 2 | Полнота | T-02: не упомянуто что `create_access_token` уже поддерживает `expires_delta` | 🟢 SUGGESTION |
| 3 | Полнота | H-02: нет стратегии миграции существующих plaintext-секретов | 🟡 WARNING |
| 4 | Полнота | `_generate_bind_token` использует дефолтный `secret_key` — предсказуемый bind token | 🟢 SUGGESTION |

---

## Детальный разбор

### 🟡 WARNING #1: T-05 — конфликт имён параметра `request`

**Текущий код** (`telegram_auth.py:18-19`):
```python
async def telegram_login(
    request: TelegramLoginRequest,  # Pydantic body
    db: AsyncSession = Depends(get_db)
):
```

**Предложенный fix в плане:**
```python
@limiter.limit("5/minute")
async def telegram_login(request: Request, ...):
```

SlowAPI требует параметр `request: Request`. Но `TelegramLoginRequest` тоже нужен для парсинга тела. Нельзя иметь два параметра с именем `request`.

**Существующий паттерн в проекте** (`auth.py:118-121`):
```python
async def login(
    request: Request,       # Для slowapi
    data: LoginRequest,     # Pydantic body — переименован!
    response: Response,
    db: ...
):
```

**Исправление в плане:** Показать полную сигнатуру с переименованием:

```python
@router.post("/login", response_model=TelegramLoginResponse)
@limiter.limit("5/minute")
async def telegram_login(
    request: Request,                    # Для slowapi (добавлен)
    data: TelegramLoginRequest,          # Переименован из request → data
    db: AsyncSession = Depends(get_db)
):
```

Все обращения `request.init_data` → `data.init_data`.

Аналогично для `bind_telegram`: `request: TelegramBindRequest` → `request: Request` + `data: TelegramBindRequest`, обращения `request.token` → `data.token`.

---

### 🟡 WARNING #2: H-02 — миграция существующих данных

План предлагает шифровать секреты через Fernet, но не упоминает что:
1. В БД уже могут быть plaintext-секреты (SMTP пароль, Telegram tokens)
2. Нужна одноразовая миграция: прочитать plaintext → зашифровать → записать обратно
3. Alembic миграция не подходит (это data migration, не schema migration)
4. Нужен скрипт или startup hook для шифрования при первом запуске с новым ключом

**Исправление:** Добавить в H-02:
> Миграция: при первом запуске с `SECRETS_ENCRYPTION_KEY` — прочитать все plaintext-значения, зашифровать, записать. Добавить флаг `secrets_encrypted` в `system_settings` для отслеживания.

---

### 🟢 SUGGESTION #3: T-02 — create_access_token поддерживает expires_delta

`security.py:40`:
```python
def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
```

Параметр `expires_delta` уже есть. Для короткоживущего токена:

```python
access_token = create_access_token(
    data={"sub": str(user.id)},
    expires_delta=timedelta(minutes=5)
)
```

Не нужно менять `settings.access_token_expire_minutes` или создавать отдельную функцию. Стоит отметить это в плане.

---

### 🟢 SUGGESTION #4: _generate_bind_token с дефолтным secret_key

`telegram_auth_service.py:116`:
```python
secret = getattr(settings, 'secret_key', 'default')
```

При дефолтном `secret_key = "changeme-generate-random-string-64-chars"` (development) — bind token полностью предсказуем. Атакующий в development-окружении может сгенерировать bind link для любого пользователя.

Не critical (только development), но стоит упомянуть как связанное с существующим warning в `config.py:54`.

---

## Вердикт

```
VERDICT: ✅ APPROVED — с minor замечаниями
```

План готов к реализации. После трёх раундов критики:

**Структурно:**
- Telegram Auth правильно сгруппирован как единый epic
- Приоритеты логичны (Telegram epic → C-01 → HIGH → MEDIUM → LOW)
- Стратегия тестирования адекватна

**Технически:**
- HMAC fix корректен (raw query string, не `_parse_init_data`)
- ВсеFinding верифицированы против реального кода
- Фактических ошибок нет

**Что исправить перед реализацией:**
1. T-05: показать полную сигнатуру с `request: Request` + `data: TelegramLoginRequest`
2. H-02: добавить стратегию миграции plaintext → encrypted
3. T-02: отметить что `expires_delta` уже поддерживается

Это implementation-level детали, не структурные проблемы. Можно приступать к реализации.
