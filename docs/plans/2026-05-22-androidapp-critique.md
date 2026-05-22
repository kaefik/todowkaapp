# Критика плана: Android App Todowka

**Дата**: 2026-05-22
**Документ**: `docs/plans/2026-05-22-androidapp.md`

---

## Сводная таблица

| # | Линза | Проблема | Серьёзность | Исправление |
|---|-------|----------|-------------|-------------|
| 1 | Полнота | Cookie-based auth — архитектурный антипаттерн для мобильных | 🔴 BLOCKER | Добавить Bearer token поддержку в бэкенд |
| 2 | Полнота | Версии библиотек устарели на 1-2 года | 🟡 WARNING | Обновить все версии до актуальных |
| 3 | Полнота | Нет обработки multi-user / data isolation | 🔴 BLOCKER | Добавить user_id фильтрацию в Room queries |
| 4 | Полнота | Нет стратегии миграций Room DB | 🟡 WARNING | Добавить fallbackToDestructiveMigration или Migration |
| 5 | Полнота | SSE foreground service — ненадёжно на Android 12+ | 🟡 WARNING | Заменить на polling через WorkManager |
| 6 | Полнота | Нет обработки first install vs update | 🟢 SUGGESTION | Добавить version tracking в DataStore |
| 7 | Полнота | Не указан ProGuard/R8 config для Retrofit+Kotlinx Serialization | 🟡 WARNING | Добавить keep-rules для сериализуемых классов |
| 8 | Согласованность | Koin 3.5 + Kotlin 2.0 несовместимы с актуальными версиями | 🟡 WARNING | Koin 4.x + Kotlin 2.3.x |
| 9 | Согласованность | "Полная копия веб-дизайна" vs Android UX конвенции | 🟡 WARNING | Уточнить: копировать layout или адаптировать |
| 10 | Риски | PersistentCookieJar (franmontiel) не обновлялась годами | 🔴 BLOCKER | Самописный CookieJar или переход на Bearer |
| 11 | YAGNI | Coil для image loading — зачем? В приложении нет изображений | 🟢 SUGGESTION | Убрать Coil, заменить на vector icons |
| 12 | YAGNI | Domain layer (Use Cases) — overkill для такого проекта | 🟢 SUGGESTION | Убрать use cases, оставить ViewModel → Repository |
| 13 | Техническая | Нет обработки encrypt/decrypt при смене device PIN | 🟡 WARNING | EncryptedSharedPreferences теряет данные при смене lock |
| 14 | Техническая | AlarmManager + SCHEDULE_EXACT_ALARM — user revocable на Android 12+ | 🟢 SUGGESTION | Graceful fallback на inexact alarms |
| 15 | Полнота | Нет описания error handling стратегии | 🟡 WARNING | Добавить: Result<T>, error states в UI, retry logic |
| 16 | Полнота | Не указан minimum API для Compose | 🟢 SUGGESTION | Compose стабильно работает с API 21+, но план указывает 26 — ОК |
| 17 | YAGNI | Фаза 6 (Telegram, Admin, Backup) — не нужна для первой версии | 🟡 WARNING | Вынести в отдельный план или убрать |
| 18 | Согласованность | `Kotlinx Serialization` указана, но Retrofit по умолчанию использует Gson/Moshi | 🟡 WARNING | Явно указать конвертер |

---

## Детальный разбор

### 🔴 BLOCKER #1: Cookie-based auth — архитектурный антипаттерн

**Проблема**: План предполагает использование cookie-based JWT через OkHttp CookieJar. Это плохая идея для мобильных:

1. **PersistentCookieJar (franmontiel)** — библиотека не обновлялась годами, имеет баги с сохранением HttpOnly/SameSite флагов
2. Cookie management на мобильных хрупкий — теряется при очистке данных, при смене шифрования
3. Нет стандарта для мобильных — все крупные мобильные API используют Bearer tokens
4. `EncryptedSharedPreferences` теряет данные при смене device PIN/password
5. Token refresh через cookie-based flow сложнее и ненадёжнее

**Исправление**: Добавить Bearer token support в бэкенд. Минимальные изменения:
- Бэкенд: добавить опциональный `Authorization: Bearer <token>` header в `get_current_user`
- Android: хранить access_token и refresh_token как строки в EncryptedSharedPreferences
- Refresh: POST `/api/auth/refresh` с refresh_token в body или header
- Это **не ломает** веб-версию (куки продолжают работать)

---

### 🔴 BLOCKER #3: Нет обработки multi-user / data isolation

**Проблема**: План не упоминает, как изолировать данные между пользователями. Room database хранит данные всех пользователей в одном файле. Если пользователь A логинится, потом логаутится, потом логинится пользователь B — данные пользователя A остаются в базе.

В веб-версии это решается через `userId` в Dexie queries: `activeTasks(userId)`.

**Исправление**:
- Добавить `user_id` колонку во все entity таблицы
- Все DAO queries должны фильтровать по `WHERE user_id = :userId`
- При logout — очищать данные только текущего пользователя (`DELETE FROM tasks WHERE user_id = :userId`)
- SyncMetaEntity тоже должен быть per-user

---

### 🔴 BLOCKER #10: PersistentCookieJar устарела

**Проблема**: `PersistentCookieJar` (franmontiel) — единственная популярная библиотека для persistent cookies в OkHttp. Последний коммит — 2022. Не поддерживает OkHttp 5.x, имеет баги с SameSite cookie.

**Исправление**: При переходе на Bearer tokens (BLOCKER #1) — проблема исчезает. Если остаёмся на cookies — нужен самописный `CookieJar` на основе `EncryptedSharedPreferences` или `DataStore<Proto>`.

---

### 🟡 WARNING #2: Версии библиотек устарели

| Библиотека | В плане | Актуальная |
|-----------|---------|-----------|
| Kotlin | 2.0+ | **2.3.21** |
| Compose BOM | 2024.x | **2026.05.01** |
| Koin | 3.5+ | **4.2.1** (мажорная!) |
| Retrofit | 2.11+ | **3.0.0** / 2.12.0 |
| OkHttp | 4.12+ | **5.3.2** |
| Kotlinx Serialization | 1.7+ | **1.11.0** |
| FCM | 24.0 | **25.0.2** |
| Navigation Compose | 2.8+ | **2.9.8** |
| Room | 2.6+ | 2.8.4 |
| WorkManager | 2.10+ | 2.11.2 |

**Исправление**: Обновить таблицу версий. Выбрать: Retrofit 3.0 + OkHttp 5.x или Retrofit 2.12 + OkHttp 4.12. Koin 3.5 → 4.x (breaking changes в API).

---

### 🟡 WARNING #4: Нет стратегии миграций Room

**Проблема**: Указана `TodowkaDatabase, версия 1`. Что происходит при изменении схемы (добавление колонки, новой таблицы)? План не описывает стратегию миграций.

**Исправление**: Добавить один из вариантов:
- `fallbackToDestructiveMigration()` — для начальной разработки (данные теряются)
- Явные `Migration(N, N+1)` для production
- Учесть в плане Phase 1

---

### 🟡 WARNING #5: SSE foreground service ненадёжно

**Проблема**: SSE через foreground service на Android 12+:
- Требует `foregroundServiceType = dataSync` + permission
- OEM (Xiaomi, Samsung, Huawei) агрессивно убивают foreground services
- Постоянное SSE-соединение расходует батарею
- Notification channel для foreground service обязателен

**Исправление**: Заменить SSE foreground service на:
- **WorkManager periodic polling** (каждые 15 мин) как основной механизм
- SSE только когда app в foreground (ViewModel scope, не service)
- Или: SSE в foreground service с автоматическим fallback на polling при отключении

---

### 🟡 WARNING #7: ProGuard/R8 для сериализации

**Проблема**: Kotlinx Serialization + Retrofit + ProGuard/R8 — классическая ловушка. Без keep-rules сериализованные классы будут обфусцированы и JSON перестанет парситься.

**Исправление**: Добавить в план:
- `@Serializable` annotation на всех DTO
- ProGuard rules: `-keepattributes *Annotation*, *Serial*` + keep для всех DTO классов
- Или: `@Keep` annotation
- Тестирование release build обязательно

---

### 🟡 WARNING #9: "Полная копия веб-дизайна" vs Android конвенции

**Проблема**: План говорит "полная копия веб-дизайна", но некоторые веб-паттерны плохо работают на Android:
- Sidebar drawer вместо bottom navigation — неестественно для мобильных
- Hover effects (web) → long press (Android) — разный UX
- Модалки как full-screen overlay — на Android лучше bottom sheets
- Веб responsive breakpoints не нужны на мобильном

**Исправление**: Уточнить что именно копируется:
- Layout structure (sidebar positions, card layout) — да
- Interaction patterns — адаптировать к Android (bottom sheet вместо modal, ripple вместо hover)
- Navigation — drawer на планшетах, bottom nav на телефонах

---

### 🟡 WARNING #13: EncryptedSharedPreferences и смена lock screen

**Проблема**: EncryptedSharedPreferences использует Android Keystore, который привязан к lock screen. При смене PIN/password/pattern — ключи могут стать недоступными, cookies/tokens теряются, пользователь разлогинивается.

**Исправление**:
- Обернуть чтение EncryptedSharedPreferences в try-catch
- При ошибке расшифровки — очистить данные и перенаправить на логин
- Альтернатива: `Jetpack Security Crypto` с `MasterKey`, который более устойчив к смене lock

---

### 🟡 WARNING #15: Нет стратегии обработки ошибок

**Проблема**: План не описывает:
- Как обрабатывать сетевые ошибки (timeout, no connection, 500)
- Как показывать ошибки пользователю
- Retry стратегию для sync engine
- Конфликты при offline → online

**Исправление**: Добавить секцию:
- Network errors → `Result<T>` sealed class в repository
- UI state: Loading / Success / Error с retry кнопкой
- Sync errors → exponential backoff (1s, 2s, 4s, 8s, max 5min)
- Max 3 retries для push mutations, потом — mark as failed

---

### 🟡 WARNING #17: Фаза 6 — слишком много для первой версии

**Проблема**: Фаза 6 включает Admin panel, Telegram integration, Backup schedule — это ~30% работы, но не является core functionality.

**Исправление**: Разбить на:
- **V1.0**: Phases 1-5 (GTD + Calendar + Review + Notifications + Settings)
- **V1.1**: i18n, Export/Import, Dark mode, Onboarding
- **V2.0**: Admin, Telegram, Backup

---

### 🟢 SUGGESTION #11: Coil не нужен

В приложении нет пользовательских изображений — только иконки, цвета и текст. Coil добавляет ~1MB к APK без реальной пользы.

**Исправление**: Убрать Coil. Использовать `Icon()` compose с Material Icons или vector drawables.

---

### 🟢 SUGGESTION #12: Domain layer (Use Cases) — overkill

Для проекта такого масштаба Use Cases создают лишний бойлерплейт без реальной пользы. ViewModel → Repository Pattern достаточно для чистой архитектуры.

**Исправление**: Убрать domain/usecase/ — оставить ViewModel → Repository → Data. Это уменьшит количество файлов на ~30%.

---

## Инверсия предположений

### Предположение 1: Cookie-based auth будет работать

```
Предположение: Cookie-based JWT через PersistentCookieJar будет работать
Инверсия:     Cookies теряются/повреждаются при хранении, пользователь не может залогиниться
Влияние:      Полная неработоспособность приложения
Смягчение:    Добавить Bearer token поддержку в бэкенд, использовать стандартный подход
```

### Предположение 2: SSE foreground service будет надёжен

```
Предположение: SSE через foreground service обеспечит real-time updates
Инверсия:     OEM убивает foreground service, SSE отключается, нет обновлений
Влияние:      Пользователь не получает обновления задач от других устройств
Смягчение:    WorkManager periodic polling (15 мин) как fallback, SSE только в foreground
```

### Предположение 3: Комната (Room) будет работать для одного пользователя

```
Предположение: Room database содержит данные только одного пользователя
Инверсия:     Пользователь переключает аккаунты или device делится между людьми
Влияние:      Данные пользователей смешиваются, privacy breach
Смягчение:    user_id во всех таблицах, per-user фильтрация в DAO
```

---

## Пропущенные сценарии

| Сценарий | Риск | Обработка |
|----------|------|-----------|
| Пользователь меняет device lock (PIN) | 🟡 EncryptedSharedPreferences теряет данные | try-catch → re-login |
| App killed by system (low memory) | 🟡 Pending mutations теряются | Mutations persisted in Room (survives kill) |
| Backend недоступен при initial sync | 🟡 Пустой экран, нет данных | Показать "загрузка" + retry, кэш пуст |
| Два устройства одновременно редактируют одну задачу | 🟡 Конфликт данных | LWW (уже описано), но нужно показать UI-conflict |
| Синхронизация при 1000+ задач | 🟡 Производительность Room | Pagination, incremental sync (описано) |
| Пользователь удаляет app data через настройки | 🟡 Все локальные данные теряются | Нормально — initial sync при следующем запуске |
| App update с изменением Room schema | 🟡 Crash при открытии | Room migration strategy (отсутствует в плане) |
| Retrofit 3.0 + OkHttp 5.x несовместимость | 🟡 Зависит от выбора версий | Retrofit 3.0 зависит от OkHttp 4.12 (не 5.x) |
| FCM token invalidated (app restore, OS update) | 🟢 Push перестаёт работать | onNewToken callback → re-register на бэкенде |
| Пользователь находится в timezone без IANA | 🟢 Крайне редко | Fallback на UTC |

---

## Вердикт

```
VERDICT: 🟡 CONDITIONAL — исправить 3 блокера, затем продолжить
```

**Обязательные исправления перед реализацией:**

1. 🔴 **Cookie → Bearer token**: Добавить Bearer token support в бэкенд (минимальные изменения). Cookie-based auth на мобильных — путь к страданиям.
2. 🔴 **Multi-user isolation**: Добавить `user_id` во все Room entities и DAO queries.
3. 🔴 **PersistentCookieJar**: Убирается вместе с переходом на Bearer tokens.

**Рекомендуемые исправления (до реализации):**

- Обновить версии библиотек до актуальных
- Добавить Room migration strategy
- Заменить SSE foreground service на polling + foreground-only SSE
- Убрать Domain/usecase layer (overkill)
- Убрать Coil (нет изображений)
- Добавить error handling стратегию
- Разбить Фазу 6 на отдельные версии
