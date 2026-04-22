# ConfirmDialog для подтверждения удаления задач

## Проблема

Удаление задач не имеет единого UX подтверждения:
- Перемещение в корзину — без подтверждения
- Удаление из корзины — через `window.confirm()` (некрасиво, не соответствует дизайну)

## Решение

Создать переиспользуемый компонент `ConfirmDialog` на основе существующих паттернов проекта (`createPortal` + Tailwind). Заменить все `window.confirm()` на кастомный диалог. Добавить подтверждение при перемещении в корзину.

## Компонент ConfirmDialog

**Файл:** `frontend/src/components/ConfirmDialog.tsx`

### Пропсы

| Проп | Тип | Описание |
|------|-----|----------|
| `open` | `boolean` | Видимость диалога |
| `title` | `string` | Заголовок |
| `message` | `string` | Описание действия |
| `confirmText` | `string` | Текст кнопки подтверждения |
| `cancelText` | `string` | Текст кнопки отмены (default: "Отмена") |
| `variant` | `'danger' \| 'normal'` | Стиль кнопки подтверждения |
| `onConfirm` | `() => void` | Callback подтверждения |
| `onCancel` | `() => void` | Callback отмены |

### UI-паттерн

Следует стилю TaskEditModal/TaskDetailModal:
- Оверлей: `fixed inset-0 z-[9999] bg-black/75 dark:bg-black/90`
- Карточка: `bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md`
- Адаптив: мобильные — снизу (`items-end`), десктоп — по центру (`items-center`)
- Закрытие по клику на оверлей

### Стили кнопок

- Danger confirm: `bg-red-600 hover:bg-red-700 text-white`
- Normal confirm: `bg-indigo-600 hover:bg-indigo-700 text-white`
- Cancel: `border border-gray-300 text-gray-700 hover:bg-gray-50`

## Интеграция

### 1. GtdTaskList.tsx — перемещение в корзину

State: `confirmDeleteId: string | null`
- Кнопка Delete → `setConfirmDeleteId(task.id)` вместо прямого `moveTask`
- ConfirmDialog: `title="Переместить в корзину?"`, `variant="danger"`, `confirmText="Удалить"`
- On confirm → `moveTask(id, 'trash')` + `setConfirmDeleteId(null)`

### 2. GtdTaskList.tsx — удаление из корзины

State: `confirmPermanentDeleteId: string | null`
- Заменить `window.confirm()` на ConfirmDialog
- `title="Удалить навсегда?"`, `message="Это действие нельзя отменить"`, `variant="danger"`, `confirmText="Удалить навсегда"`

### 3. Trash.tsx — очистка корзины

State: `showClearConfirm: boolean`
- Заменить `window.confirm()` на ConfirmDialog
- `title="Очистить корзину?"`, `message="Все задачи будут удалены навсегда"`, `variant="danger"`, `confirmText="Очистить"`

## Файлы

- Новый: `frontend/src/components/ConfirmDialog.tsx`
- Изменённые: `frontend/src/routes/GtdTaskList.tsx`, `frontend/src/routes/Trash.tsx`
- Обновить: `docs/features.md`
