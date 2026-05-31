# Аудит безопасности фронтенда Todowka (v2)

**Дата:** 2026-05-31
**Статус:** План исправлений (v2 — после критики)
**Предыдущий аудит:** `docs/plans/2026-05-28-security-frontend.md` (заменён данным документом)
**Критика:** `docs/plans/2026-05-31-security-frontend-critique.md`

---

## Контекст деплоя

Архитектура Docker-деплоя (`frontend/Dockerfile` + `nginx.conf`):
- Nginx раздаёт статику из `/usr/share/nginx/html`
- Nginx проксирует `/api` → `http://backend:8000`
- Бэкенд (`backend/app/main.py:75-92`) через `SecurityHeadersMiddleware` устанавливает все заголовки безопасности для API-ответов: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security` (production), `Content-Security-Policy`
- TLS-терминация — ответственность reverse-proxy/ingress перед nginx-контейнером

**Следствие:** Заголовки безопасности есть для API. Отсутствуют только для статических файлов (JS/CSS/HTML). Это LOW, не CRITICAL.

---

## Статус предыдущих исправлений (из плана 2026-05-28)

| # | Проблема | Статус |
|---|----------|--------|
| 1.1 | Валидация URL в SW notificationclick | Не исправлено → включено в P1.3 |
| 1.2 | Обновление зависимостей (npm audit) | Не проверено → включено в P3.3 |
| 2.1 | Очистка IndexedDB (checklistItems, calendarEvents) | Не исправлено → включено в P2.2 |
| 2.2 | try/catch в SyncProvider SSE | Не исправлено → включено в P2.1 |
| 2.3 | telegram_bot_token → has_telegram_bot | Не исправлено → включено в P1.2 |
| 3.1 | Sourcemaps | Удалено — Vite не генерирует sourcemaps по умолчанию |
| 3.3 | Абсолютные URL в httpClient | Удалено — не активная уязвимость |
| 3.6 | Конфликт PWA манифестов | Удалено — не security, UI-проблема |
| 3.8 | Dev server headers | Удалено — не продакшн |

---

## Находки

### [MEDIUM] F1. Telegram bot token в localStorage

**Файлы:**
- `src/stores/authStore.ts:15,342-348` — `partialize` сохраняет весь объект `user` включая `telegram_bot_token`
- `src/api/users.ts:12` — тип `User` содержит `telegram_bot_token`
- `src/routes/Settings.tsx:435,439` — чтение маскированного токена
- `src/components/BackupScheduleSettings.tsx:42` — чтение маскированного токена

**Уточнение:** Бэкенд маскирует токен (`*****12345`), полный токен никогда не попадает на клиент. Риск — раскрытие 5 последних символов + концептуальная проблема хранения PII в localStorage.

**Решение:**
1. Исключить `telegram_bot_token` из Zustand `partialize` через деструктуризацию:
   ```ts
   type PersistedUser = Omit<User, 'telegram_bot_token'>
   
   partialize: (state) => ({
     user: state.user
       ? (({ telegram_bot_token: _, ...rest }: User) => rest) as PersistedUser
       : null,
     isAuthenticated: state.isAuthenticated,
   }),
   ```
2. Settings.tsx: оставить `telegram_bot_token` для записи (отправка нового токена), читать через `user.telegram_bot_token` из API (не из localStorage)

**Критерии приёмки:**
- `localStorage.getItem('auth-storage')` не содержит `telegram_bot_token`
- Settings корректно показывает статус подключения бота
- Отправка нового токена работает

---

### [MEDIUM] F2. SSE-данные парсятся без валидации

**Файлы:**
- `src/components/SyncProvider.tsx:131` — `JSON.parse((event as MessageEvent).data)` без try/catch
- `src/stores/notificationStore.ts:191-231` — аналогично

`extractEntityId` (SyncProvider.tsx:86-89) извлекает ID для удаления данных. Если SSE-данные невалидны — unhandled exception + событие теряется.

**Решение:**
1. Обернуть `JSON.parse` в try/catch в обоих местах
2. Добавить минимальную проверку структуры:
   ```ts
   try {
     const data = JSON.parse((event as MessageEvent).data)
     if (!data || typeof data !== 'object') return
     // ... дальнейшая обработка
   } catch {
     if (import.meta.env.DEV) console.warn('[SyncSSE] Invalid SSE payload')
     return
   }
   ```

**Критерии приёмки:**
- Невалидный SSE-payload логируется, но не прерывает обработку следующих событий
- Отсутствующий/некорректный `entityId` не вызывает удаление данных

---

### [MEDIUM] F3. Очистка IndexedDB при logout — неполная

**Файл:** `src/db/init.ts:30-39`

`clearLocalData` не очищает таблицы:
- `checklistItems` (`src/db/database.ts:113`)
- `calendarEvents` (`src/db/database.ts:131`)

При смене аккаунта данные чеклистов и календаря предыдущего пользователя остаются.

**Решение:** Добавить в `clearLocalData`:
```ts
await db.checklistItems.where('userId').equals(userId).delete()
await db.calendarEvents.where('userId').equals(userId).delete()
```

**Критерии приёмки:**
- При logout/смене аккаунта данные чеклистов и календаря предыдущего пользователя отсутствуют

---

### [MEDIUM] F4. Service Worker — небезопасная навигация

**Файл:** `src/sw.ts`

Две проблемы:

1. **notificationclick (строки 76-93):** URL из `event.notification.data?.url` используется в `client.navigate(url)` и `clients.openWindow(url)` без валидации origin. Скомпрометированный push-сервер может перенаправить на фишинговый сайт.

2. **fetch handler (строки 58-74):** Navigate-запросы перехватываются без проверки `url.origin === self.location.origin`. По спецификации SW получает события только своего scope, но проверка — best practice.

**Решение:**
```ts
function isValidLocalUrl(url: string): boolean {
  try {
    return new URL(url, self.location.origin).origin === self.location.origin
  } catch {
    return false
  }
}
```

В notificationclick — обернуть `url` в `isValidLocalUrl`. В fetch handler — добавить `if (url.origin !== self.location.origin) return`.

**Критерии приёмки:**
- Push с `https://evil.com` не открывает вредоносный сайт
- Push с корректным внутренним URL работает
- Push без URL открывает `/`

---

### [LOW] F5. Заголовки безопасности для статики в nginx.conf

**Файл:** `frontend/nginx.conf`

Для статических файлов (JS/CSS/HTML) не установлены заголовки безопасности. API-ответы получают заголовки от бэкенда. Это defense-in-depth мера.

**Решение:** Добавить в `nginx.conf`:
```nginx
location / {
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    try_files $uri $uri/ /index.html;
}
```

> Не добавлять `add_header` в `location /api` — это перезапишет заголовки от бэкенда (nginx не наследует `add_header` из server-блока если в location есть свой `add_header`).

---

### [LOW] F6. Console-вызовы с чувствительными данными

**Файлы:** `syncEngine.ts`, `browserNotifications.ts`, `NotificationProvider.tsx`, `sseManager.ts`

Не все ~60 console-вызовов опасны. Удалить/обернуть только те, что логируют:
- API payload с пользовательскими данными (`syncEngine.ts` — payload мутаций)
- Данные уведомлений (`browserNotifications.ts:94` — title, body, permission)
- Структуру SSE-данных

Общие `[SW] Install event`, `[Component] Rendered` — оставить, они не содержат пользовательских данных.

**Решение:** Обернуть чувствительные вызовы в `if (import.meta.env.DEV)`.

---

### [LOW] F7. API_BASE_URL не используется в authStore

**Файл:** `src/stores/authStore.ts` — 6 мест (строки 59, 113, 149, 222, 255, 311)

Все запросы в `authStore.ts` используют хардкод `/api/...` вместо `API_BASE_URL` из `httpClient.ts`. Это не уязвимость, но нарушает консистентность — при изменении `VITE_API_BASE_URL` auth-запросы не подхватят новое значение.

**Решение:** Заменить хардкод на `import.meta.env.VITE_API_BASE_URL || '/api'` (как в httpClient.ts:3).

---

### [LOW] F8. Валидация default-section в Login/Register

**Файлы:** `src/routes/Login.tsx:49-50`, `src/routes/Register.tsx:75-76`

`default-section` из localStorage читается без проверки через `VALID_SECTIONS`. Защита есть в `DefaultSectionRedirect` (router.tsx), но не при первом входе.

---

### [LOW] F9. Register не отправляет credentials: 'include'

**Файл:** `src/stores/authStore.ts:113-117`

**Уточнение после проверки бэкенда:** `/api/auth/register` (`backend/app/api/auth.py:42-98`) НЕ устанавливает cookies — просто возвращает `UserResponse`. Cookies устанавливаются только в `/login`. Поэтому `credentials: 'include'` не нужен.

Статус: **Не требует исправления.** Удалено из плана.

---

### [INFO] I1. HTTPS / TLS-терминация

`frontend/nginx.conf` слушает порт 80. TLS-терминация — ответственность инфраструктуры (reverse-proxy, ingress, cloud LB). Добавление SSL в nginx.conf сломает Docker-деплой (нет сертификатов).

**Решение:** Создать `docs/deployment.md` с инструкцией по TLS-терминации.

---

### [INFO] I2. IndexedDB без шифрования

Все данные в открытом виде. Ни одно популярное веб-приложение не шифрует IndexedDB. Защита от физического доступа — задача ОС. Вынести в far-future backlog.

---

### [INFO] I3. Фильтрация server error detail на фронтенде

**Файл:** `src/api/httpClient.ts:97-104`

Текущее решение — показывать `errorData.detail` как есть. Фильтрация на фронтенде (проверка на `Traceback`) хрупкая и не масштабируется. Правильное решение — убедиться что бэкенд не отправляет внутренние ошибки в `detail`. Это бэкендная задача.

---

## Положительные находки

- **XSS не обнаружен** — нет `dangerouslySetInnerHTML`, `eval()`, `document.write()`
- **Cookie-based httpOnly аутентификация** — токены не доступны из JS
- **Все заголовки безопасности** установлены бэкендом через `SecurityHeadersMiddleware`
- **Zod-валидация** на всех формах
- **CSRF-защита** через `X-Requested-With: XMLHttpRequest`
- **Нет внешних CDN-скриптов** без SRI
- **Зависимости актуальные** + overrides для CVE транзитивных пакетов

---

## План исправлений

### Приоритет 1 — Средний (4 задачи)

#### 1.1. Валидация SSE-данных (F2)
**Файлы:** `src/components/SyncProvider.tsx:131`, `src/stores/notificationStore.ts:191-231`
- Добавить try/catch вокруг JSON.parse
- Минимальная проверка структуры данных

#### 1.2. Исключить telegram_bot_token из localStorage (F1)
**Файлы:** `src/stores/authStore.ts:342-348`, `src/routes/Settings.tsx`, `src/components/BackupScheduleSettings.tsx`
- Деструктуризация в partialize
- Проверить что Settings корректно работает без персистированного токена

#### 1.3. Валидация URL в Service Worker (F4)
**Файл:** `src/sw.ts`
- `isValidLocalUrl()` для notificationclick
- Проверка origin в fetch handler

#### 1.4. Очистка IndexedDB при logout (F3)
**Файл:** `src/db/init.ts:30-39`
- Добавить `checklistItems` и `calendarEvents`

---

### Приоритет 2 — Низкий (4 задачи)

#### 2.1. Console-вызовы с чувствительными данными (F6)
**Файлы:** `syncEngine.ts`, `browserNotifications.ts`
- Обернуть в `if (import.meta.env.DEV)` только вызовы с пользовательскими данными
- Не трогать общие отладочные логи

#### 2.2. Заголовки для статики в nginx.conf (F5)
**Файл:** `frontend/nginx.conf`
- Добавить `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` в `location /`
- НЕ добавлять в `location /api`

#### 2.3. Унифицировать API_BASE_URL (F7)
**Файл:** `src/stores/authStore.ts`
- Заменить 6 хардкод `/api/` на `import.meta.env.VITE_API_BASE_URL || '/api'`

#### 2.4. Валидация default-section (F8)
**Файлы:** `src/routes/Login.tsx`, `src/routes/Register.tsx`

---

### Приоритет 3 — Инфраструктурный (1 задача)

#### 3.1. Документировать TLS-терминацию (I1)
- Создать `docs/deployment.md` с примерами для Traefik, Caddy, nginx reverse-proxy

---

### Удалено из плана (обоснование)

| Пункт | Причина |
|-------|---------|
| C1 (CRITICAL: CSP в nginx) | Бэкенд уже ставит все заголовки. Понижено до LOW (F5) |
| H1 (HIGH: HTTPS) | Инфраструктурная задача, не фронтенд. Перенесено в INFO (I1) |
| M2 (IndexedDB шифрование) | YAGNI, ни один конкурент этого не делает |
| M4 (error detail фильтрация) | Задача бэкенда, не фронтенда |
| M5 (credentials: include) | Бэкенд не ставит cookies при register, не нужно |
| 3.1 (sourcemaps) | Vite не генерирует по умолчанию |
| 3.3 (абсолютные URL) | Не активная уязвимость |
| 3.5 (Onboarding ProtectedRoute) | Компонент сам проверяет auth |
| 3.6 (PWA манифесты) | Не security |
| 3.7 (exportImport refresh) | UX-баг, не security |
| 3.8 (dev server headers) | Не продакшн |

---

## Zero-day уязвимости

**Zero-day не обнаружено.** Реальные риски:
- SSE без валидации → при компрометации бэкенда возможна манипуляция данными
- SW без проверки URL → при компрометации push-сервера возможен фишинг
- localStorage с PII → при XSS утечка данных
