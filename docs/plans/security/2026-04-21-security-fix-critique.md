# Критический разбор: План исправления безопасности

**Дата:** 2026-04-21
**Документ:** `docs/plans/security/2026-04-21-security-fix.md`
**Вердикт:** 🟡 CONDITIONAL

---

## Step 1 — Пять линз критики

### Lens 1: Полнота (Completeness)

| # | Проблема | Серьёзность | Описание |
|---|----------|-------------|----------|
| C1 | Не описано обновление тестов | 🔴 BLOCKER | В `test_auth.py` **17 тестов** напрямую проверяют `access_token` в JSON-ответе (строки 117, 176, 185, 238, 419, 452). План требует убрать access_token из ответа, но не описывает обновление тестов. Все тесты упадут. |
| C2 | SSE-токен после cookie-only | 🔴 BLOCKER | SSE-менеджер (`sseManager.ts:97-99`) передаёт access_token через query parameter: `?token=${this.token}`. После cookie-only этот токен не будет доступен в JS. План упоминает "SSE-подключения работают (используют query param token)" но **не описывает как SSE получит токен** если он убран из localStorage. |
| C3 | SSE backend уже использует cookie | 🟢 SUGGESTION | SSE endpoints (`sse.py:20,46`) уже используют `get_current_user_from_cookie`. Это совместимо с cookie-only, но только если cookie отправляется. EventSource с `withCredentials: true` (`sseManager.ts:107`) отправит cookie — однако при cross-origin в DEV-режиме это может не работать. План не описывает cross-origin cookie для SSE. |
| C4 | Zustand persist синхронизация | 🟡 WARNING | План предлагает убрать `accessToken` из persist, но не описывает как восстанавливать сессию при перезагрузке страницы. Сейчас `isAuthenticated: true` в persist означает "мы залогинены", но без токена фронтенд не сможет подтвердить это. Нужно описать: при загрузке → если `isAuthenticated && !accessToken` → вызвать `fetchCurrentUser` (который отправит httpOnly cookie). |
| C5 | httpClient.ts не отправляет credentials | 🟡 WARNING | Текущий `httpClient.ts` (строки 49-53) отправляет fetch **без** `credentials: 'include'`. Токен передаётся через `Authorization` header. После cookie-only **все** запросы через httpClient перестанут быть аутентифицированными. Задача 1.4 упоминает это, но в задаче 1.2 изменения httpClient описаны как "убрать Authorization header" без явного добавления `credentials: 'include'` в `fetchWithAuth`. |
| C6 | Нет стратегии отката | 🟡 WARNING | Итерация 1 — самая рискованная (оценка "Высокий" в плане). Нет описания что делать если после внедрения обнаружится критический баг. Нужен фича-флаг или механизм быстрого отката к Bearer header модели. |

### Lens 2: Согласованность (Consistency)

| # | Проблема | Серьёзность | Описание |
|---|----------|-------------|----------|
| C7 | Противоречие в Task 1.3 vs SSE | 🔴 BLOCKER | Задача 1.3 предлагает "Убрать или сделать опциональным HTTPBearer для основных endpoints". Но 56 endpoint'ов в 8 роутерах используют `get_current_user` (который зависит от HTTPBearer). Если убрать Bearer — SSE-запросы через query param не будут работать для не-SSE endpoints. Нужно чётко описать стратегию: `get_current_user_from_cookie` становится дефолтом, `get_current_user` остаётся только для SSE (или SSE полностью переходит на cookie). |
| C8 | CSRF исключает /login но не /logout | 🟡 WARNING | В CSRF middleware (Итерация 3) `SKIP_PATHS` содержит `/api/auth/login`, `/api/auth/register`, `/api/auth/refresh`. Но `/api/auth/logout` — тоже POST без CSRF. Хотя logout менее критичен, злоумышленник может принудительно разлогинить пользователя через CSRF. |
| C9 | TokenResponse в схемах vs реальное использование | 🟡 WARNING | `TokenResponse` определён в `schemas/auth.py` и используется в `api/auth.py`. Но фронтенд может полагаться на поле `token_type` из ответа. План предлагает убрать `access_token` но не упоминает судьбу `token_type`. |

### Lens 3: Допущения и риски (Assumptions & Risks)

| # | Допущение | Что если неверно? |
|---|-----------|-------------------|
| A1 | "httpOnly cookie будет работать для всех API-запросов из браузера" | Если frontend и backend на разных доменах (DEV-режим: `localhost:5173` → `localhost:8000`), cross-origin cookie может блокироваться браузером. SameSite=strict + cross-origin = cookie не отправляется. | 
| A2 | "SSE с withCredentials: true отправит cookie" | В DEV-режиме SSE подключается к `http://127.0.0.1:8000` (`sseManager.ts:86`), а фронтенд на `localhost:5173`. `127.0.0.1` != `localhost` — браузер может не отправить cookie. |
| A3 | "Все существующие сессии сохранятся после миграции" | После cookie-only миграции, пользователи с токеном в localStorage потеряют доступ — их httpOnly cookie может истечь к моменту деплоя. Нужен graceful transition. |

### Lens 4: YAGNI & Раздувание scope

| # | Элемент | Вердикт |
|---|---------|---------|
| Y1 | Итерация 3 — CSRF middleware | 🟡 **Рассмотреть для Phase 2.** Cookie уже используют `SameSite=strict`. Для внутреннего приложения (не публичный SaaS) CSRF — желательна, но не блокер. SameSite=strict защищает от большинства CSRF-атак в современных браузерах. |
| Y2 | Итерация 4 — Блокировка аккаунта + progressive rate limiting | 🟢 **Оставить, но упростить.** Блокировка аккаунта — хорошая идея. Progressive rate limiting требует additional state. Можно начать только с account lockout. |
| Y3 | Задача 2.2 — Автогенерация ключа | 🟡 **Избыточно для текущего этапа.** Задача 2.1 (валидация в production) достаточна. Автогенерация при запуске — nice-to-have, добавляет сложность в bootstrap. |

### Lens 5: Техническая осуществимость

| # | Проблема | Серьёзность | Описание |
|---|----------|-------------|----------|
| T1 | Cross-origin cookie в development | 🔴 BLOCKER | Frontend: `localhost:5173`, Backend: `localhost:8000` (или `127.0.0.1:8000` для SSE). `SameSite=strict` cookie **не отправляется** при cross-origin запросах. Нужно либо: (а) проксировать через Vite dev server, (б) использовать `SameSite=lax`, (в) обслуживать frontend и backend на одном origin. План не описывает решение. |
| T2 | EventSource не отправляет кастомные headers | 🟡 WARNING | Это уже решено через query param + SSETokenMiddleware. Но после cookie-only, SSE должен работать через cookie. EventSource поддерживает `withCredentials: true` (`sseManager.ts:107`), но нужно убедиться что cookie отправляется. |
| T3 | Зависимость между get_current_user и 56 endpoints | 🟡 WARNING | Замена `get_current_user` (HTTPBearer) на cookie-based для 56 endpoints — масштабное изменение. Нужно обновить импорты во всех 8 роутерах. План описывает только изменение dependencies.py, но не обновление роутеров. |

---

## Step 2 — Инверсия допущений

### Инверсия 1: Cross-origin cookie

```
Допущение:    httpOnly cookie будет отправляться с каждого fetch-запроса
Инверсия:     Cross-origin запросы НЕ отправляют cookie с SameSite=strict
Влияние:      Все API-запросы из фронтенда возвращают 401
Решение:      В development — использовать Vite proxy (proxy /api → localhost:8000)
              В production — SameSite=lax (достаточно для защиты) или единый origin
              Обновить sseManager: убрать http://127.0.0.1:8000, использовать /api/sse/... (прокси)
```

### Инверсия 2: SSE-токен недоступен

```
Допущение:    SSE продолжит работать после cookie-only миграции
Инверсия:     sseManager.ts не может получить токен для query param (он не в localStorage)
Влияние:      SSE-уведомления перестают работать
Решение:      SSE должен использовать cookie-based auth (withCredentials: true + cookie)
              Backend SSE endpoints уже используют get_current_user_from_cookie
              Убрать передачу токена через query param из sseManager
              Убрать SSETokenMiddleware из main.py (или оставить как fallback)
```

### Инверсия 3: Существующие пользователи теряют сессию

```
Допущение:    Миграция прозрачна для пользователей
Инверсия:     Пользователи с токеном в localStorage не имеют httpOnly cookie
Влияние:      Все текущие пользователи принудительно разлогинены после деплоя
Решение:      Graceful transition: в первой версии — оставить cookie И заголовок
              Добавить fallback: если есть Bearer header — использовать его
              Через 1-2 недели (после истечения refresh_token) — убрать fallback
```

---

## Step 3 — Пропущенные сценарии

| Сценарий | Риск | Обработка |
|----------|------|-----------|
| Пользователь открывает приложение в нескольких вкладках, одна вкладка делает logout | 🟡 | Logout очищает cookie, но другие вкладки продолжат работать до следующего запроса. Zustand persist в других вкладках всё ещё `isAuthenticated: true`. Нужен `storage` event listener для синхронизации logout между вкладками. |
| Access token истёк, refresh endpoint возвращает 401 | 🟢 | Уже обработано в httpClient.ts:55-89. После cookie-only — нужно убедиться что refresh также отправляет cookie. |
| Параллельные запросы при истёкшем access token | 🟢 | Уже обработано: refreshPromise singleton в httpClient.ts:71-79. Совместимо с cookie-only. |
| CORS preflight для cookie-based запросов | 🟡 | `credentials: true` в CORS (main.py:84) уже настроен. Но `allow_origins` должен содержать точный origin, не `*`. Сейчас用的是 конкретные origins — ОК. |
| Блокировка аккаунта: злоумышленник намеренно блокирует чужой аккаунт | 🟡 | Account lockout после 5 неудачных попыток (Итерация 4) может быть использован для DoS конкретного пользователя. Нужна блокировка по IP+username, не только по username. |
| Тест `test_cookie_secure_flag_in_production` (строки 392-422) | 🟡 | Проверяет `access_token` из JSON (`login_response.json()['access_token']`). Упадёт после Итерации 1. |

---

## Step 4 — Сводная таблица и Вердикт

### Summary Table

| # | Линза | Проблема | Серьёзность | Исправление |
|---|-------|----------|-------------|-------------|
| C1 | Полнота | 17 тестов упадут после удаления access_token из ответа | 🔴 BLOCKER | Добавить задачу: обновить все тесты в test_auth.py |
| C2 | Полнота | SSE-менеджер не получит токен после cookie-only | 🔴 BLOCKER | SSE должен использовать cookie (withCredentials), убрать query param token |
| C5 | Полнота | httpClient.ts не отправляет credentials: 'include' | 🟡 WARNING | Явно добавить credentials: 'include' в fetchWithAuth |
| C4 | Полнота | Не описано восстановление сессии при перезагрузке | 🟡 WARNING | Добавить: при загрузке → isAuthenticated && fetchCurrentUser через cookie |
| C7 | Соглас. | Противоречие: get_current_user (56 endpoints) vs cookie-only | 🔴 BLOCKER | Заменить get_current_user на get_current_user_from_cookie во всех роутерах |
| C8 | Соглас. | /logout не в CSRF SKIP_PATHS | 🟡 WARNING | Добавить /api/auth/logout в SKIP_PATHS (или не добавлять — это нормально) |
| T1 | Техн. | SameSite=strict + cross-origin = cookie не отправляется | 🔴 BLOCKER | Vite proxy в dev, SameSite=lax в prod, или единый origin |
| T3 | Техн. | 8 роутеров нужно обновить для нового dependency | 🟡 WARNING | Добавить задачу: обновить импорты во всех роутерах |
| A3 | Допущ. | Текущие пользователи теряют сессию | 🟡 WARNING | Graceful transition period с fallback на Bearer header |
| C6 | Полнота | Нет стратегии отката | 🟡 WARNING | Добавить feature flag для cookie-only |

### Verdict

```
VERDICT: 🟡 CONDITIONAL — address blockers (C1, C2, C7, T1), then proceed
```

**4 блокера** должны быть решены до начала реализации:

1. **T1** — Определить стратегию для cross-origin cookie (Vite proxy или SameSite=lax)
2. **C2** — Описать как SSE будет работать без query param токена
3. **C7** — Описать замену `get_current_user` → `get_current_user_from_cookie` во всех 8 роутерах
4. **C1** — Добавить задачу по обновлению 17+ тестов

**Рекомендация:** Добавить в Итерацию 1:
- Задачу 1.5: Настроить Vite proxy для development (убрать cross-origin)
- Задачу 1.6: Обновить все 8 API роутеров (заменить dependency)
- Задачу 1.7: Обновить SSE-менеджер (cookie-based вместо query param)
- Задачу 1.8: Обновить все тесты (test_auth.py + другие)
- Задачу 1.9: Добавить восстановление сессии при загрузке приложения

И рассмотреть **graceful transition** (Итерация 1a → 1b):
- 1a: Добавить cookie auth как fallback, оставить Bearer header работающим
- 1b: Через N дней убрать Bearer header, перейти на cookie-only
