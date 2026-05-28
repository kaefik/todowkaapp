# Аудит безопасности фронтенда Todowka

**Дата:** 2026-05-28
**Статус:** План исправлений (v4 — с учётом трёх проходов критики)
**Критика:** `docs/plans/2026-05-28-security-frontend-critique.md`

---

## ВЫСОКИЕ уязвимости

### 1. [HIGH] Open Redirect в Service Worker через push-уведомления

**Файл:** `src/sw.ts:76-93`

URL из `event.notification.data?.url` используется напрямую в `client.navigate(url)` и `clients.openWindow(url)` без валидации origin. Скомпрометированный push-сервер может перенаправить пользователя на фишинговый сайт.

**Решение:** Добавить функцию `isValidLocalUrl` и внедрить её в существующую логику (не заменяя текущий код):

```ts
function isValidLocalUrl(url: string): boolean {
  try {
    return new URL(url, self.location.origin).origin === self.location.origin
  } catch {
    return false
  }
}

sw.addEventListener('notificationclick', (event: SWNotificationEvent) => {
  event.notification.close()
  const url = event.notification.data?.url
  event.waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients: SWClient[]) => {
      if (clients.length > 0) {
        const client = clients[0]!
        if (url && isValidLocalUrl(url)) {
          client.navigate(url)
        }
        return client.focus()
      }
      if (url && isValidLocalUrl(url)) {
        return sw.clients.openWindow(url)
      }
      return sw.clients.openWindow('/')
    })
  )
})
```

---

### 2. [HIGH] Известные уязвимости в зависимостях (npm audit)

| Пакет | Severity | CVE | Описание |
|-------|----------|-----|----------|
| `@babel/plugin-transform-modules-systemjs` | HIGH (8.2) | GHSA-fv7c-fp4j-7gwp | Генерация произвольного кода |
| `fast-uri` | HIGH (7.5) | GHSA-q3j6-qgpj-74h6 | Path traversal |
| `fast-uri` | HIGH (7.5) | GHSA-v39h-62p7-jpjc | Host confusion |
| `tmp` | HIGH | GHSA-ph9p-34f9-6g65 | Path traversal |
| `brace-expansion` | MODERATE (6.5) | GHSA-jxxr-4gwj-5jf2 | DoS через большие ranges |

Все `fixAvailable: true`. Все уязвимости в **devDependencies** (не попадают в продакшн-бандл).

**Риск:** `patch-package` для `vite-plugin-pwa+1.2.0.patch` может перестать работать после обновления. Перед `npm audit fix` — проверить совместимость патча.

---

## СРЕДНИЕ уязвимости

### 3. [MEDIUM] `telegram_bot_token` в localStorage

**Файлы:**
- `src/stores/authStore.ts:15,341-348`
- `src/api/users.ts:12`

Объект `User` содержит `telegram_bot_token` (маскированное значение `*****12345`) и через Zustand persist сохраняется в localStorage. **Бэкенд уже маскирует токен** (`backend/app/schemas/user.py:52-62`), поэтому полный токен никогда не попадает в localStorage. Однако маскированное значение раскрывает 5 последних символов, и вся концепция хранения PII в localStorage уязвима при XSS.

**Архитектурное улучшение (не критический фикс):**
- Бэкенд: заменить `telegram_bot_token` на `has_telegram_bot: boolean` + `telegram_bot_token_masked: string | null`
- Фронтенд: backward compatibility — `const hasTelegramBot = user.has_telegram_bot ?? !!user.telegram_bot_token`
- Zustand persist: исключить `telegram_bot_token` из partialize через деструктуризацию
- Учесть эндпоинты записи в Settings.tsx (строки 421, 486) — для отправки нового токена нужно оставить поле в `updateCurrentUser`

### 4. [MEDIUM] SW перехватывает навигацию без проверки origin

**Файл:** `src/sw.ts:58-74`

Fetch handler перехватывает ВСЕ navigate-запросы без проверки `url.origin === self.location.origin`.

**Решение:** Добавить проверку origin в fetch handler:
```ts
if (url.origin !== self.location.origin) return
```

### 5. [MEDIUM] IndexedDB: неполная очистка при logout

**Файл:** `src/db/init.ts:30-39`

Функция `clearLocalData` очищает не все таблицы. Пропущены:
- `checklistItems` (`src/db/database.ts:113`)
- `calendarEvents` (`src/db/database.ts:131`)

При смене аккаунта данные чеклистов и календаря предыдущего пользователя остаются в IndexedDB.

**Решение:** Добавить очистку пропущенных таблиц в `clearLocalData`:
```ts
await db.checklistItems.where('userId').equals(userId).delete()
await db.calendarEvents.where('userId').equals(userId).delete()
```

### 6. [MEDIUM] JSON.parse без try/catch в SyncProvider

**Файл:** `src/components/SyncProvider.tsx:131`

Невалидные SSE-данные вызывают unhandled exception в callback. EventSource-соединение при этом **не разрывается** (ошибка в callback не вызывает onerror), но событие теряется без логирования.

**Решение:** Обернуть `JSON.parse` в try/catch, при ошибке — логировать и продолжать.

---

## НИЗКИЕ и информационные находки

### 7. [LOW] httpClient допускает абсолютные URL

**Файл:** `src/api/httpClient.ts:50`

Условие `url.startsWith('http')` позволяет направить запрос на произвольный URL. В текущем коде ни один вызов не передаёт абсолютный URL. Архитектурное улучшение, не активная уязвимость. Cookies не утекут — httpOnly cookies привязаны к домену приложения, CORS бэкенда ограничивает origins.

### 8. [LOW] exportImport обходит httpClient

**Файл:** `src/api/exportImport.ts:20,58`

Прямой `fetch` без refresh-token логики. При истёкшем токене — ошибка без авто-refresh.

- **Экспорт** (GET, возвращает JSON) — можно и нужно перевести на `httpClient.get`
- **Импорт** (POST FormData) — нельзя перевести на httpClient: он делает `JSON.stringify` и ставит `Content-Type: application/json`, что сломает загрузку файлов

**Решение:** Экспорт — заменить на `httpClient.get`. Импорт — добавить ручной refresh при 401, или добавить метод `httpClient.upload` с поддержкой FormData. Это баг UX, не security-уязвимость.

### 9. [LOW] Sourcemaps могут утечь в продакшн

**Файл:** `vite.config.ts`

Нет явного `build.sourcemap: false`. Vite по умолчанию не генерирует sourcemaps, но стоит зафиксировать явно.

### 10. [LOW] VALID_SECTIONS не проверяется в Login/Register

**Файлы:** `src/routes/Login.tsx:49-50`, `src/routes/Register.tsx:75-76`

`default-section` из localStorage читается без валидации. Защита есть в `DefaultSectionRedirect` (router.tsx), но не при первом входе.

### 11. [INFO] `escapeValue: false` в i18next

**Файл:** `src/i18n/index.ts:111`

Стандартная настройка для React (React сам экранирует). Не уязвимость.

### 12. [INFO] Заголовки безопасности уже установлены

Бэкенд (`backend/app/main.py:75-91`) уже устанавливает через `SecurityHeadersMiddleware`:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (production)
- `Content-Security-Policy: default-src 'self'; ...`

Дополнительных действий не требуется. Для dev-режима можно добавить заголовки в `vite.config.ts` → `server.headers`.

---

## Положительные находки

- **Нет** `dangerouslySetInnerHTML`, `eval()`, `innerHTML`, `document.write()`
- **Нет** `postMessage`, WebSocket — нет соответствующих векторов
- Аутентификация через **httpOnly cookies** (не localStorage)
- CSRF-защита через `X-Requested-With: XMLHttpRequest`
- Бэкенд **маскирует** `telegram_bot_token` перед отправкой клиенту
- React Hook Form + Zod для валидации форм
- Strict TypeScript (`strict: true`)
- Все API-запросы используют относительные URL (нет mixed content)
- `serialize-javascript` >= 7.0.5 зафиксирован в overrides (исправление XSS)
- Все security-заголовки установлены бэкендом

---

## План исправлений (по приоритету)

### Приоритет 1 — Высокий

#### 1.1. Валидация URL в Service Worker

**Файл:** `src/sw.ts`

Добавить `isValidLocalUrl()` и внедрить в существующую логику `notificationclick` (строки 76-93) и `fetch` handler (строки 58-74). Не заменять текущий код целиком — сохранить `matchAll`, `focus()`, `event.waitUntil()`.

**Критерии приёмки:**
- Push-уведомление с `https://evil.com` не открывает вредоносный сайт
- Push-уведомление с невалидным URL не крашит SW
- Push-уведомление с корректным внутренним URL: навигация + фокус существующего окна
- Push-уведомление без URL: открытие `/` как раньше

#### 1.2. Обновить зависимости

```bash
cd frontend
cat patches/vite-plugin-pwa+1.2.0.patch  # проверить совместимость
npm audit fix
npm run build                             # проверить сборку
```

**Критерии приёмки:**
- `npm audit` показывает 0 уязвимостей
- `npm run build` без ошибок
- PWA работает (SW регистрация, офлайн-страница)

---

### Приоритет 2 — Средний

#### 2.1. Дополнить очистку IndexedDB

**Файл:** `src/db/init.ts:30-39`

Добавить в `clearLocalData`:
```ts
await db.checklistItems.where('userId').equals(userId).delete()
await db.calendarEvents.where('userId').equals(userId).delete()
```

**Критерии приёмки:**
- При logout и входе под другим пользователем — данные чеклистов и календаря предыдущего отсутствуют

#### 2.2. Добавить try/catch в SyncProvider

**Файл:** `src/components/SyncProvider.tsx:131`

Обернуть `JSON.parse` в try/catch, при ошибке — `console.warn` и continue.

**Критерии приёмки:**
- Невалидный SSE-payload логируется, но не прерывает обработку следующих событий

#### 2.3. Заменить `telegram_bot_token` на `has_telegram_bot` (архитектурное улучшение)

- **Бэкенд:** добавить `has_telegram_bot: bool` в UserResponse, убрать полное поле (маскированное оставить как опциональное)
- **Фронтенд:** backward compatibility `user.has_telegram_bot ?? !!user.telegram_bot_token`
- **Zustand partialize:** деструктуризация `telegram_bot_token` из `state.user`
- **Settings.tsx:** оставить `telegram_bot_token` для записи (строки 421, 486), использовать `has_telegram_bot` для чтения (строки 435, 439)

**Критерии приёмки:**
- localStorage не содержит полный/маскированный `telegram_bot_token`
- Settings корректно показывает статус и позволяет подключить/отключить бота

---

### Приоритет 3 — Низкий (можно отложить)

#### 3.1. Явно запретить sourcemaps

**Файл:** `vite.config.ts` — добавить `build.sourcemap: false`

#### 3.2. Валидация default-section в Login/Register

**Файлы:** `src/routes/Login.tsx:49-50`, `src/routes/Register.tsx:75-76`

Добавить проверку через `VALID_SECTIONS`.

#### 3.3. Убрать поддержку абсолютных URL в httpClient

**Файл:** `src/api/httpClient.ts:50`

Убрать `url.startsWith('http')` после проверки что нет зависимостей.

#### 3.4. Добавить refresh-token в exportImport

**Файл:** `src/api/exportImport.ts`

Добавить ручной refresh при 401 (не заменяя на httpClient — он не поддерживает FormData).

#### 3.5. Заголовки для Vite dev server

**Файл:** `vite.config.ts` — добавить `server.headers` для dev-режима (production уже покрыт бэкендом).

---

## Zero-day уязвимости

**Zero-day уязвимостей не обнаружено.** Основной риск — Open Redirect в Service Worker и неполная очистка IndexedDB при смене аккаунта.
