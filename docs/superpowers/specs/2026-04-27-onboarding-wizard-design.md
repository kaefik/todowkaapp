# Onboarding Wizard — Design Spec

## Summary

Трёхшаговый визард при первом входе с нового устройства. Обязательный, без пропуска. Спрашивает язык, таймзону и раздел по умолчанию. Результаты сохраняются в бэкенд + localStorage.

## Flow

1. Пользователь логинится или регистрируется
2. Проверяем `localStorage.getItem('onboarding-complete')`
3. Если отсутствует → редирект на `/onboarding`
4. Пользователь проходит 3 шага
5. После завершения:
   - PATCH-запрос к бэкенду с `{ language, timezone, default_section }`
   - `localStorage.setItem('onboarding-complete', 'true')`
   - `i18n.changeLanguage(selectedLanguage)`
   - Редирект на выбранный раздел по умолчанию
6. При повторном входе с того же устройства — визард не показывается

## Маршрут

- `/onboarding` — отдельный полноэкранный маршрут, без AppLayout (sidebar/header)
- Находится вне ProtectedRoute, но с проверкой авторизации внутри компонента
- Если не авторизован → редирект на `/login`
- Если `onboarding-complete` уже есть → редирект на `/`

## Шаг 1: Выбор языка

- Динамически читает список языков из конфигурации i18next (не хардкод)
- Каждый язык отображается как карточка с флагом и названием
- При клике — сразу вызывает `i18n.changeLanguage()` для переключения UI
- Остальные шаги отображаются на выбранном языке
- Кнопка «Далее» неактивна до выбора языка

## Шаг 2: Выбор таймзоны

- Автоопределение через `Intl.DateTimeFormat().resolvedOptions().timeZone`
- Показывает зелёную плашку с определённой таймзоной
- Выпадающий список с популярными таймзонами + поле поиска
- Кнопка «Далее» активна сразу (таймзона уже определена)

## Шаг 3: Выбор раздела по умолчанию

- Сетка карточек с иконками для каждого раздела:
  - Входящие (inbox), Активные (active), Сегодня (today), Завтра (tomorrow), Следующие (next), Ожидание (waiting), Когда-нибудь (someday), Проекты (projects)
- При выборе — подсветка выбранной карточки
- Кнопка «Начать работу» неактивна до выбора

## Прогресс-бар

- Три точки/шаги сверху экрана: 1/3, 2/3, 3/3
- Текущий шаг подсвечен, пройденные — заполнены

## Backend

### Новое поле

- `language` (String, nullable, default=null) в модели `User`

### Миграция

- Alembic миграция для добавления колонки `language`

### Схемы

- `UserUpdate` — добавить опциональное поле `language`
- `UserResponse` — добавить поле `language`

### API

- Сохранение через существующий эндпоинт обновления профиля (PATCH)
- Все три значения (language, timezone, default_section) отправляются одним запросом после завершения визарда

## Frontend

### Новые файлы

- `src/routes/Onboarding.tsx` — корневой компонент визарда с роутом `/onboarding`
- `src/components/OnboardingWizard.tsx` — управление шагами и состоянием
- `src/components/OnboardingLanguage.tsx` — шаг 1
- `src/components/OnboardingTimezone.tsx` — шаг 2
- `src/components/OnboardingSection.tsx` — шаг 3

### i18n

- Новый неймспейс `onboarding` для каждого языка
- Ключи: заголовки шагов, кнопки, подсказки, названия разделов

### Удаляемое

- `TimezoneSetupModal.tsx` — заменяется визардом
- Логика показа TimezoneSetupModal в login/register flow

### Изменения в существующих файлах

- `router.tsx` — добавить маршрут `/onboarding`
- `authStore.ts` — после логина/регистрации: проверка localStorage → редирект на `/onboarding` или на default section
- `src/i18n/locales/ru/onboarding.json` — переводы
- `src/i18n/locales/en/onboarding.json` — переводы
- `src/i18n/index.ts` — подключить новый неймспейс
