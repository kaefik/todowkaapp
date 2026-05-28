# Критический разбор v3: Аудит безопасности фронтенда

**Дата:** 2026-05-28
**Целевой план:** `docs/plans/2026-05-28-security-frontend.md` (v3)
**Вердикт:** 🟡 CONDITIONAL — 1 блокер, 3 уточнения

---

## Верификация утверждений

Все основные утверждения плана подтверждены по исходному коду. Предыдущие критические ошибки (маскировка токена, заголовки безопасности, SW код) исправлены корректно.

---

## 🔴 БЛОКЕР

### 1. TypeScript strict-ошибка при деструктуризации в partialize

**План (пункт 2.3):** Предлагает `const { telegram_bot_token, ...rest } = state.user`

**Проблема:** `rest` будет типа `Omit<User, 'telegram_bot_token'>`. В Zustand `partialize` возвращает `Partial<AuthState>`, где `user?: User | null`. Тип `Omit<User, 'telegram_bot_token'>` **не присваиваем** к `User` — отсутствует обязательное поле. TypeScript strict mode выдаст ошибку компиляции.

**Решение:** Явно указать тип для persisted user:
```ts
type PersistedUser = Omit<User, 'telegram_bot_token'>

partialize: (state) => ({
  user: state.user ? (({ telegram_bot_token: _, ...rest }) => rest) as PersistedUser : null,
  isAuthenticated: state.isAuthenticated,
}),
```

Или сделать `telegram_bot_token` опциональным в интерфейсе `User`, или использовать cast.

---

## 🟡 УТОЧНЕНИЯ

### 2. Упущен BackupScheduleSettings.tsx

**План (пункт 2.3):** Перечисляет файлы для обновления при замене `telegram_bot_token` → `has_telegram_bot`, но не упоминает `src/components/BackupScheduleSettings.tsx:42`:
```ts
const telegramConnected = !!(user.telegram_bot_token && user.telegram_chat_id)
```
Этот файл тоже нужно обновить на `user.has_telegram_bot`.

### 3. exportImport: экспорт можно перевести на httpClient

**План (пункт 8):** Объединяет экспорт и импорт как «нельзя заменить на httpClient». На самом деле:
- **Экспорт** (GET, возвращает JSON) — МОЖНО и нужно перевести на httpClient (refresh при 401)
- **Импорт** (POST FormData) — НЕЛЬЗЯ перевести (httpClient делает JSON.stringify)

Стоит уточнить в плане.

### 4. Два манифеста PWA — не упоминается

`public/manifest.json` (статический, theme_color `#2563eb`) и генерируемый VitePWA манифест (theme_color `#4f46e5`, другие иконки) конфликтуют. `index.html:11` содержит `<meta name="theme-color" content="#2563eb">`, что не совпадает с VitePWA. Это не security-проблема, но баг конфигурации. План не упоминает.

---

## ✅ ПОДТВЕРЖДЕНО БЕЗ ЗАМЕЧАНИЙ

| Утверждение | Статус |
|-------------|--------|
| notificationclick: типы, поведение, isValidLocalUrl | OK |
| userId-индексы в Dexie для checklistItems и calendarEvents | OK |
| Полнота таблиц в clearLocalData (нет других пропущенных) | OK |
| try/catch вокруг JSON.parse — единственное нужное изменение | OK |
| Push handler не вектор атаки (только notificationclick) | OK |
| httpClient: нет абсолютных URL в production-коде | OK |
| npm audit fix: patch-package риск учтён | OK |

---

## Вердикт

```
🟡 CONDITIONAL — исправить блокер (TypeScript тип), затем приступать к реализации
```

Все 12 уязвимостей плана верифицированы. Предложенный код для SW notificationclick корректен. Единственный блокер — TypeScript-ошибка при деструктуризации в partialize, которая обнаружится только на этапе компиляции.
