# Критический разбор #2: План исправления безопасности

**Дата:** 2026-04-21
**Документ:** `docs/plans/security/2026-04-21-security-fix.md` (исправленная версия)
**Предыдущий разбор:** `2026-04-21-security-fix-critique.md`
**Вердикт:** 🟡 CONDITIONAL

---

## Что было исправлено с первого разбора

| Блокер | Статус |
|--------|--------|
| C1 — 17 тестов упадут | ✅ Задача 1.6 — детальное обновление тестов |
| C2 — SSE без токена | ✅ Задача 1.4 — убрать query param, SSE через cookie |
| C7 — 56 endpoints vs cookie-only | ✅ Задача 1.5 — get_current_user переписан, sse.py обновить |
| T1 — SameSite=strict + cross-origin | ✅ Задача 1.1 — заменить на lax |
| A3 — Graceful transition | ✅ Этапы 1a/1b — Bearer fallback |

План значительно улучшился после первого разбора. Основные архитектурные проблемы решены.

---

## Новые находки

### BLOCKER (2)

#### B1. Брутфорс: user=None → AttributeError

**Задача 3.1** описывает логику:
1. Найти пользователя по username
2. Если `locked_until > now` → вернуть 429
3. Проверить пароль
4. Если неверный → `failed_login_attempts += 1`

Если username не существует, `user` is None. Обращение к `user.locked_until` и `user.failed_login_attempts` вызовет `AttributeError`.

**Исправление:** Добавить проверку `if user is None` перед логикой блокировки. Вернуть 401 "Incorrect username or password", но **не** увеличивать счётчик (нет пользователя). Это также предотвращает информацию о существовании username через timing-атаку — если задержка при блокировке отличается от ответа "не существует".

#### B2. Брутфорс: противоречие 429 vs 401

В псевдокоде задачи 3.1:
- Шаг 2: `locked_until > now` → вернуть **429** "Account temporarily locked"
- Шаг 4: неверный пароль → вернуть **401**

Но затем текст: *"сообщение одинаковое для заблокирован и неверный пароль (оба 401)"*

Это **противоречие** между псевдокодом и описанием.

**Исправление:** Унифицировать: оба случая возвращают 401 "Incorrect username or password". Не раскрываем информацию о блокировке.

---

### WARNING (5)

#### W1. LoginRequest в schemas/user.py, а не schemas/auth.py

Задача 5.2 ссылается на `backend/app/schemas/auth.py` для добавления `max_length` в `LoginRequest`. Но в `api/auth.py:14`: `from app.schemas.user import LoginRequest`. `LoginRequest` находится в `schemas/user.py`.

**Исправление:** Изменить путь к файлу в задаче 5.2 на `backend/app/schemas/user.py`.

#### W2. Удаление лога токена без замены

Задача 5.1 удаляет `logger.debug(f"Token: {token[:10]}...rest via {auth_type}")`. При cookie-only модели отладка аутентификации станет сложнее.

**Исправление:** Заменить на логирование user_id после успешного decode:
```python
logger.debug(f"Auth via {auth_type}, user_id={payload.get('sub')}")
```

#### W3. Alembic миграция — server_default для существующих строк

Задача 3.1 добавляет `failed_login_attempts: Mapped[int] = mapped_column(default=0)`. Это Python default для новых объектов, но **не** SQL default для существующих строк. SQLite не поддерживает `ALTER TABLE ADD COLUMN ... DEFAULT` без явного указания.

**Исправление:** В миграции добавить `server_default=text("0")`:
```python
op.add_column('users', sa.Column('failed_login_attempts', sa.Integer(), server_default=text('0'), nullable=False))
```

#### W4. SSE через Vite proxy — совместимость с EventSource

Задача 1.4 предлагает убрать `http://127.0.0.1:8000` и использовать `/api/sse/notifications` через Vite proxy. Vite использует `http-proxy`, который по умолчанию буферизует ответ — SSE может не работать корректно.

**Исправление:** Проверить что Vite proxy корректно проксирует SSE. При необходимости добавить в `vite.config.ts`:
```typescript
'/api/sse': {
  target: 'http://localhost:8000',
  changeOrigin: true,
  // SSE требует отключения буферизации
}
```
Или подтвердить что текущий proxy конфиг (`/api` → `localhost:8000`) уже работает с SSE.

#### W5. PWA Workbox может кешировать /api/auth/*

`vite.config.ts:39-51` определяет `runtimeCaching` для изображений. Но Workbox по умолчанию может кешировать POST-запросы к `/api/auth/login` через navigation preload или precache. Если ответ login закеширован, новый cookie не установится.

**Исправление:** Явно исключить `/api/auth/*` из кеширования в workbox config:
```typescript
navigateFallbackDenylist: [/^\/api/],
```
Или добавить `runtimeCaching` exclude rule для `/api/auth/*`.

---

### SUGGESTION (1)

#### S1. Production reverse proxy

План не обсуждает production развёртывание. Cookie с `SameSite=lax` требуют same-origin для POST-запросов с cookie. Если фронтенд и API на разных портах/доменах — cookie не отправится. Стоит добавить замечание: в production нужен reverse proxy (nginx) для единого origin.

---

## Summary Table

| # | Линза | Проблема | Серьёзность | Исправление |
|---|-------|----------|-------------|-------------|
| B1 | Feasibility | user=None → AttributeError в брутфорс-логике | 🔴 BLOCKER | Добавить `if user is None` перед блокировкой |
| B2 | Consistency | 429 vs 401 — противоречие в задаче 3.1 | 🔴 BLOCKER | Унифицировать: оба случая → 401 |
| W1 | Consistency | LoginRequest в schemas/user.py, не auth.py | 🟡 WARNING | Исправить путь в задаче 5.2 |
| W2 | Completeness | Удаление лога без замены | 🟡 WARNING | Заменить на лог user_id после decode |
| W3 | Feasibility | server_default для Alembic миграции | 🟡 WARNING | Добавить server_default=text("0") |
| W4 | Feasibility | SSE через Vite proxy может не работать | 🟡 WARNING | Протестировать SSE через proxy |
| W5 | Completeness | Workbox может кешировать /api/auth/* | 🟡 WARNING | Исключить из runtimeCaching |
| S1 | Completeness | Production reverse proxy не обсуждается | 🟢 SUGGESTION | Добавить замечание о nginx |

---

## Вердикт

```
VERDICT: 🟡 CONDITIONAL — исправить 2 блокера, затем приступать
```

**Блокеры:**
1. **B1** — Добавить обработку `user is None` в логике брутфорс-блокировки (задача 3.1)
2. **B2** — Унифицировать HTTP-код для заблокированного аккаунта (401, не 429)

Warnings можно адресовать в процессе реализации.
