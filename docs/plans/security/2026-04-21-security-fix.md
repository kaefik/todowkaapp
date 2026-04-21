# План исправления проблем безопасности страницы входа

**Дата:** 2026-04-21
**Статус:** Одобрен (после двух критических разборов)
**Приоритет:** Критический
**Критический разбор #1:** `2026-04-21-security-fix-critique.md`
**Критический разбор #2:** `2026-04-21-security-fix-critique-r2.md`

---

## Обзор

Аудит безопасности выявил 9 проблем, из которых 3 критические, 2 высокого уровня, 3 среднего и 1 низкого. Корневая проблема — архитектурное противоречие: токены выдаются одновременно в httpOnly cookie и в JSON-ответе, что нивелирует защиту cookie.

### Ключевые архитектурные решения (по результатам критики)

1. **SameSite=lax вместо strict** — strict блокирует cookie при навигации по external links. Lax достаточен для защиты от CSRF POST-запросов и позволяет cookie при обычной навигации.
2. **Graceful transition** — Итерация 1 разделена на два этапа: сначала backend принимает и cookie, и Bearer header, затем Bearer убирается.
3. **SSE через cookie** — Vite proxy уже настроен (`vite.config.ts:60-77`, `/api` → `localhost:8000`). SSE будет идти через прокси (`/api/sse/...`), cookie будет отправляться как same-origin.
4. **get_current_user_from_cookie становится дефолтом** — заменить во всех 8 роутерах (56 endpoints).

---

## Итерация 1 — Критические исправления (cookie-only модель)

### Этап 1a: Backend поддерживает cookie + Bearer (transition)

Цель: добавить cookie-based auth как основной путь, сохранив Bearer header как fallback.

#### Задача 1.1. Изменить SameSite на lax в security.py

**Файлы:**
- `backend/app/security.py` — функции `set_access_cookie`, `clear_access_cookie`, `set_refresh_cookie`, `clear_refresh_cookie`

**Изменения:**
- Заменить `samesite="strict"` на `samesite="lax"` во всех четырёх функциях
- Причина: `strict` блокирует cookie при переходе по external link (пользователь перейдёт по ссылке на приложение — не будет авторизован). `lax` отправляет cookie при top-level GET-навигации, но не при cross-origin POST — достаточно для защиты.

#### Задача 1.2. Убрать access_token из JSON-ответа login/refresh

**Файлы:**
- `backend/app/schemas/auth.py` — обновить `TokenResponse`
- `backend/app/api/auth.py` — эндпоинты `/login`, `/refresh`

**Изменения:**
- В `TokenResponse` удалить поля `access_token` и `token_type`
- Новая схема:
```python
class TokenResponse(BaseModel):
    user: UserResponse
```
- В `/login`: не возвращать токен в теле, только `TokenResponse(user=user)`. Cookie уже устанавливаются.
- В `/refresh`: аналогично

#### Задача 1.3. Обновить dependencies.py — cookie-first с Bearer fallback

**Файлы:**
- `backend/app/dependencies.py`

**Изменения:**
- `get_current_user` — переписать: сначала читать `access_token` из cookie, если нет — из Bearer header (fallback)
```python
async def get_current_user(
    access_token: Annotated[str | None, Cookie()] = None,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_security_optional)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> User:
    token = access_token or (credentials.credentials if credentials else None)
    auth_type = "cookie" if access_token else "header"
    return await _resolve_user_by_token(token, db, auth_type=auth_type)
```
- Удалить `get_current_user_from_cookie` — больше не нужен, `get_current_user` теперь делает то же самое
- Обновить `get_current_admin_user` — без изменений, зависит от `get_current_user`
- SSE endpoints (`sse.py`) — заменить `get_current_user_from_cookie` на `get_current_user`

#### Задача 1.4. Обновить SSE — убрать query param token

**Файлы:**
- `frontend/src/services/sseManager.ts` — убрать передачу токена через query param
- `backend/app/main.py` — убрать SSETokenMiddleware

**Изменения в sseManager.ts:**
- Убрать поле `token` и параметр `token` из `connect()`
- Убрать блок добавления `?token=...` в URL (строки 97-99)
- SSE URL всегда относительный: `/api/sse/notifications` (проксируется через Vite в dev)
- Убрать DEV-специальный URL `http://127.0.0.1:8000/...` (строка 86) — использовать тот же относительный путь
- `EventSource` уже использует `withCredentials: true` (строка 107) — cookie отправится

**Изменения в main.py:**
- Удалить класс `SSETokenMiddleware`
- Удалить `app.add_middleware(SSETokenMiddleware)`

#### Задача 1.5. Обновить все 8 API роутеров

**Файлы (56 endpoints):**
- `backend/app/api/tasks.py` — 14 использований `get_current_user`
- `backend/app/api/notifications.py` — 4 использования
- `backend/app/api/users.py` — 1 использование
- `backend/app/api/auth.py` — 1 использование (`/me`)
- `backend/app/api/contexts.py` — 5 использований
- `backend/app/api/tags.py` — 7 использований
- `backend/app/api/stats.py` — 1 использование
- `backend/app/api/projects.py` — 6 использований
- `backend/app/api/areas.py` — 5 использований
- `backend/app/api/sse.py` — 2 использования `get_current_user_from_cookie` → заменить на `get_current_user`

**Изменения:**
- Во всех роутерах: импорт `get_current_user` остаётся тем же (сигнатура изменилась, но имя нет)
- В `sse.py`: заменить `from app.dependencies import get_current_user_from_cookie` на `from app.dependencies import get_current_user`
- В `auth.py`: `/me` уже использует `get_current_user` — менять не нужно
- Остальные 7 роутеров: менять не нужно, имя функции то же

**Реальное количество изменений:** только `sse.py` (заменить импорт + dependency). Остальные роутеры автоматически получат cookie-first через обновлённый `get_current_user`.

#### Задача 1.6. Обновить все backend-тесты

**Файлы:**
- `backend/tests/test_auth.py` — 17 тестов

**Изменения:**
- `test_login_valid_credentials` (строка 101): убрать проверку `"access_token" in data`, убрать проверку `data["token_type"] == "bearer"`. Проверять только `data["user"]`.
- `test_refresh_token_flow` (строка 161): убрать `initial_access_token = login_response.json()["access_token"]`. Refresh проверять через cookie, не через JSON.
- `test_me_returns_current_user` (строка 224): отправлять access_token через cookie вместо Authorization header.
- `test_me_invalid_token` (строка 256): отправлять invalid token через cookie.
- `test_cookie_secure_flag_in_production` (строка 392): убрать `login_response.json()['access_token']`, использовать cookie.
- `test_cookie_secure_flag_in_development` (строка 426): аналогично.
- `test_cookie_secure_override_via_env` (строка 460): аналогично.

**Принцип:** тесты должны отправлять access_token через cookie (`cookies={"access_token": token}`), не через `Authorization` header. Backend устанавливает cookie при login — тесты могут читать его из `response.cookies`.

#### Задача 1.7. Перевести фронтенд на cookie-only

**Файлы:**
- `frontend/src/stores/authStore.ts` — убрать localStorage, убрать accessToken
- `frontend/src/api/httpClient.ts` — убрать Authorization header, добавить credentials: 'include'

**Изменения в authStore.ts:**
- Удалить поле `accessToken` из `AuthState` интерфейса
- Удалить все `localStorage.setItem('accessToken', ...)`
- Удалить все `localStorage.removeItem('accessToken')`
- В persist `partialize`: оставить только `{ user, isAuthenticated }`
- В `login`: не читать `data.access_token`, устанавливать `{ user: data.user, isAuthenticated: true, isLoading: false, error: null }`
- В `registerAndLogin`: аналогично
- В `refreshToken`: аналогично
- В `fetchCurrentUser`: аналогично

**Изменения в httpClient.ts:**
- Добавить `credentials: 'include'` в параметры fetch внутри `fetchWithAuth` (строка 50)
- Удалить чтение `authStore.accessToken` и `localStorage.getItem('accessToken')` (строки 42-44)
- Удалить установку `Authorization` header (строка 44)
- Параметр `skipAuth` больше не нужен — убрать

#### Задача 1.8. Восстановление сессии при загрузке приложения

**Файлы:**
- `frontend/src/stores/authStore.ts`
- `frontend/src/App.tsx` или файл инициализации приложения

**Логика:**
- При загрузке приложения: если Zustand persist содержит `isAuthenticated: true` — вызвать `fetchCurrentUser` (отправит httpOnly cookie)
- Если `fetchCurrentUser` возвращает 401 — очистить state, перенаправить на login
- Если `fetchCurrentUser` успех — обновить user data
- Найти где сейчас вызывается `fetchCurrentUser` при загрузке и убедиться что логика корректна

**Синхронизация logout между вкладками:**
- Добавить `storage` event listener в authStore: при изменении `auth-storage` в другой вкладке — если `isAuthenticated` стал `false` — очистить state в текущей вкладке

### Этап 1b: Убрать Bearer fallback (через 1-2 недели)

Цель: полностью удалить Bearer header аутентификацию после переходного периода.

#### Задача 1.9. Удалить Bearer fallback из dependencies.py

**Файлы:**
- `backend/app/dependencies.py`

**Изменения:**
- В `get_current_user` убрать fallback на `credentials.credentials`
- Убрать `_security_optional` и импорт HTTPBearer
- Оставить только cookie-based: `access_token: Annotated[str | None, Cookie()]`

---

## Итерация 2 — Защита секретного ключа

### Задача 2.1. Валидация secret_key в production

**Файлы:**
- `backend/app/config.py`

**Изменения:**
```python
@field_validator("secret_key")
@classmethod
def validate_secret_key(cls, v, info):
    if v == "changeme-generate-random-string-64-chars":
        app_env = info.data.get("app_env", "development")
        if app_env == "production":
            raise ValueError("SECRET_KEY must be changed from default in production")
        import warnings
        warnings.warn("Using default SECRET_KEY. Generate a secure key for production.", stacklevel=2)
    return v
```

---

## Итерация 3 — Усиление защиты от брутфорса

### Задача 3.1. Блокировка аккаунта после неудачных попыток

**Файлы:**
- `backend/app/models/user.py` — добавить поля
- `backend/alembic/` — миграция
- `backend/app/api/auth.py` — логика блокировки
- `backend/app/config.py` — настройки

**Изменения в модели User:**
```python
failed_login_attempts: Mapped[int] = mapped_column(default=0, nullable=False)
locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
```

**Alembic миграция** — добавить `server_default` для корректной работы с существующими строками SQLite:
```python
op.add_column('users', sa.Column('failed_login_attempts', sa.Integer(), server_default=text('0'), nullable=False))
op.add_column('users', sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True))
```

**Логика в `/login`:**
1. Найти пользователя по username
2. Если `user is None` → вернуть 401 "Incorrect username or password" (без увеличения счётчика — нет пользователя для блокировки)
3. Если `user.locked_until` и `user.locked_until > now` → вернуть 401 "Incorrect username or password" (не 429! не раскрываем информацию о блокировке)
4. Проверить пароль
5. Если пароль неверный:
   - `user.failed_login_attempts += 1`
   - Если `user.failed_login_attempts >= login_max_failed_attempts` → `user.locked_until = now + login_lockout_minutes`
   - Вернуть 401 "Incorrect username or password"
6. Если пароль верный:
   - Сбросить `user.failed_login_attempts = 0`, `user.locked_until = None`
   - Выдать токены

**Настройки:**
```python
login_max_failed_attempts: int = 5
login_lockout_minutes: int = 15
```

**Защита от information disclosure:** все ошибочные сценарии (пользователь не найден, аккаунт заблокирован, неверный пароль) возвращают **один и тот же** ответ — 401 "Incorrect username or password". Атакующий не может узнать: существует ли username, заблокирован ли аккаунт.

### Задача 3.2. Уменьшить rate limit

**Файлы:**
- `backend/app/config.py`

**Изменения:**
- `login_rate_limit: int = 3` (было 5)
- Добавить `logging.warning` при превышении rate limit с IP адресом

---

## Итерация 4 — CSRF-защита (Phase 2)

> **Примечание:** Отложена до Phase 2. Cookie используют `SameSite=lax`, что защищает от CSRF POST-запросов в современных браузерах. Для внутреннего приложения этого достаточно.

### Задача 4.1. Добавить CSRF middleware (когда потребуется)

**Условия для активации:**
- Приложение становится публичным SaaS
- Появляются пользователи на старых браузерах (без SameSite поддержки)
- Требуется compliance с security standards (OWASP, SOC2)

**Реализация:**
- Double Submit Cookie pattern
- `SKIP_PATHS`: `/api/auth/login`, `/api/auth/register`, `/api/auth/refresh`, `/api/auth/logout`
- Фронтенд: читать `csrf_token` из cookie, отправлять в `X-CSRF-Token` header

---

## Итерация 5 — Средние и низкие исправления

### Задача 5.1. Заменить логирование части токена на user_id

**Файлы:**
- `backend/app/dependencies.py:28`

**Изменения:**
- Удалить строку `logger.debug(f"Token: {token[:10]}...rest via {auth_type}")`
- После успешного decode добавить: `logger.debug(f"Auth via {auth_type}, user_id={payload.get('sub')}")`

### Задача 5.2. Добавить max_length в LoginRequest

**Файлы:**
- `backend/app/schemas/user.py` (импортируется в `api/auth.py:14`)

**Изменения:**
```python
class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=128)
```

### Задача 5.3. Усилить валидацию cookie_secure

**Файлы:**
- `backend/app/config.py`

**Изменения:**
- В `set_cookie_secure_for_production`: добавить `warnings.warn` если `cookie_secure=False` и `app_env != "development"`

### Задача 5.4. Убрать console.warn в production

**Файлы:**
- `frontend/src/stores/authStore.ts`
- `frontend/src/services/sseManager.ts`

**Изменения:**
- Обернуть все `console.warn/error/log` в `if (import.meta.env.DEV) { ... }`
- Или заменить logger в sseManager на заглушку в production

### Задача 5.5. Исключить /api/auth/* из Workbox кеширования

**Файлы:**
- `frontend/vite.config.ts`

**Изменения:**
- Добавить `navigateFallbackDenylist: [/^\/api/]` в PWA config
- Это предотвращает кеширование POST-запросов к `/api/auth/login`, `/api/auth/refresh` — иначе новый cookie не установится

---

## Замечание о production развёртывании

Cookie с `SameSite=lax` требуют same-origin для POST-запросов. В production нужен reverse proxy (nginx), чтобы фронтенд и API обслуживались на одном домене:
```
location /api/ { proxy_pass http://backend:8000; }
location / { proxy_pass http://frontend:80; }
```

---

## Порядок выполнения

| Итерация | Зависимости | Оценка времени | Риск регрессии |
|----------|-------------|----------------|----------------|
| 1a (cookie + fallback) | Нет | 4-5 часов | Высокий |
| 2 (secret_key) | Нет | 15 мин | Низкий |
| 5 (мелкие) | Нет | 30 мин | Низкий |
| 3 (брутфорс) | Нет | 1-2 часа | Низкий |
| 1b (убрать fallback) | 1a + 1-2 недели | 30 мин | Средний |
| 4 (CSRF) | 1b | 2-3 часа | Средний |

**Рекомендуемый порядок:**
1. **Итерация 2 + 5** (15 + 30 мин) — быстрые исправления, независимые
2. **Итерация 1a** (4-5 часов) — основное изменение, после быстрых
3. **Итерация 3** (1-2 часа) — брутфорс, после 1a чтобы не усложнять отладку
4. **Итерация 1b** (через 1-2 недели) — убрать fallback
5. **Итерация 4** (Phase 2) — CSRF при необходимости

---

## Тестирование

### После итерации 2 + 5:
```bash
cd backend && pytest tests/ -v
cd frontend && npm test
```

### После итерации 1a — расширенная проверка:

**Backend тесты:**
```bash
cd backend && pytest tests/ -v
```
Все тесты должны проходить с обновлёнными cookie-based проверками.

**Frontend тесты:**
```bash
cd frontend && npm test
```

**Ручное тестирование:**
1. Вход через login форму → проверить что httpOnly cookie `access_token` установлен
2. Обновить страницу → сессия сохраняется (cookie отправляется)
3. Logout → cookie очищены
4. Проверить SSE-уведомления → работают через cookie
5. Проверить что DevTools > Application > localStorage не содержит `accessToken`
6. Проверить что DevTools > Application > Cookies содержит `access_token` (httpOnly)
7. Открыть 2 вкладки → logout в одной → вторая同步 отзывается
8. Проверить PWA: offline → online → сессия восстанавливается

**DevTools проверки:**
- Network tab: запросы к `/api/*` не содержат `Authorization` header
- Network tab: запросы содержат `Cookie: access_token=...` 
- SSE подключение: `/api/sse/notifications` без `?token=` parameter

### После итерации 3:
- Проверить что 5 неверных попыток → блокировка на 15 мин
- Проверить что успешный вход после блокировки сбрасывает счётчик
- Проверить что rate limit 3/мин работает

---

## Файлы для обновления после выполнения

- `docs/features.md` — добавить информацию об усилении безопасности

---

## Связанные документы

- `docs/plans/security/2026-04-21-security-fix-critique.md` — критический разбор #1
- `docs/plans/security/2026-04-21-security-fix-critique-r2.md` — критический разбор #2
- Оригинальный аудит безопасности — в контексте сессии
