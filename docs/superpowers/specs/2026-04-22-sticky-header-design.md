# Sticky Header — Дизайн-спек

## Контекст

`AppLayout.tsx` — единственный layout-компонент. Мобильный `<header>` (`lg:hidden`) — обычный block-элемент, при скролле уходит вверх. Десктопный sidebar — `fixed inset-y-0 left-0 w-64`. Верхнего бара на десктопе нет. Sticky/fixed-элементов в хедере нет вообще.

## Подход

`sticky top-0` — шапка остаётся в потоке документа, не нужен compensating padding. Минимальное вмешательство в текущую архитектуру.

## Изменения

### 1. Мобильная шапка

**Файл:** `frontend/src/components/AppLayout.tsx` (строки 163-181)

- Добавить `sticky top-0 z-30` к `<header>`
- Добавить иконку поиска (лупа) справа от NotificationBell
- Клик по лупе → открытие `SearchOverlay`

### 2. Десктопная шапка (новая)

Новый `<header>` перед мобильным, виден только на десктопе:

- `hidden lg:block sticky top-0 z-30 bg-white dark:bg-gray-800 shadow-sm h-16`
- Содержимое: логотип "Todowka" (слева), иконка поиска (центр), NotificationBell + профиль (справа)
- Флекс-ряд, `items-center`, `px-6`

### 3. Десктопный sidebar — сдвиг вниз

**Файл:** `frontend/src/components/AppLayout.tsx` (строка ~205)

- `<aside>`: заменить `inset-y-0` на `top-16 bottom-0` (чтобы не залезал под шапку)

### 4. Компонент SearchOverlay

**Новый файл:** `frontend/src/components/SearchOverlay.tsx`

- `fixed inset-0 z-[9999]`, тёмный backdrop
- Поле ввода с autofocus, live-результаты
- Escape / клик по backdrop → закрытие
- Результаты — кликабельные задачи (открывают TaskDetailModal или переходят на задачу)
- Стилизация через Tailwind, как остальной проект

### 5. OfflineBanner

Без изменений — `fixed top-0 z-50`, рисуется поверх шапки.

### 6. Z-index иерархия

| Элемент | z-index |
|---------|---------|
| Sticky header | z-30 |
| Мобильный sidebar overlay backdrop | z-40 |
| Мобильный sidebar drawer | z-50 |
| OfflineBanner | z-50 |
| SearchOverlay, модалки | z-[9999] |
| ToastContainer | z-[10000] |

## Файлы для изменения

| Файл | Действие |
|------|----------|
| `frontend/src/components/AppLayout.tsx` | Правка header + новый десктопный header + sidebar offset |
| `frontend/src/components/SearchOverlay.tsx` | Новый компонент |
| `frontend/src/components/HeaderDesktop.tsx` | Новый компонент (опционально, если хедер сложный) |

## Критерии готовности

1. Мобильная шапка остаётся видимой при скролле
2. Десктопная шапка видна всегда, не перекрывает sidebar корректно
3. Sidebar на десктопе начинается ниже шапки
4. Клик по иконке поиска открывает SearchOverlay
5. SearchOverlay ищет задачи по названию/описанию
6. OfflineBanner отображается поверх шапки
7. Тёмная тема работает корректно
8. Нет конфликтов z-index с модалками и toast'ами
