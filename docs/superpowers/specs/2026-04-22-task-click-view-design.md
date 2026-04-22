# Task Click to View Detail

## Summary

Клик по карточке задачи открывает модальное окно просмотра (`TaskDetailModal`), где пользователь может увидеть все детали задачи и перейти к редактированию через кнопку "Редактировать".

## Context

Сейчас `TaskDetailModal` используется только в `NotificationBell` и `Notifications`. В списках задач (`TaskListView`, `Tasks.tsx`) клик по карточке ничего не делает — только кнопки Edit/Delete, чекбокс и ссылки.

## Changes

### 1. `TaskListView.tsx`

- Добавить стейт `viewingTaskId: string | null` для ID задачи в модалке просмотра
- Добавить `onClick` на внешний `<div>` карточки задачи — устанавливает `viewingTaskId`
- Добавить `e.stopPropagation()` на: чекбокс, кнопки (Edit, Delete, move), `<Link>` на проект, секцию подзадач
- Добавить `TaskDetailModal` в рендер с `onEdit` который открывает `TaskEditModal`
- В props `TaskDetailModal.onEdit`: закрыть просмотр, открыть редактирование

### 2. `Tasks.tsx`

- Добавить стейт `viewingTaskId: string | null`
- Добавить `onClick` на карточки задач (active и completed)
- `e.stopPropagation()` на чекбокс и кнопки
- Добавить `TaskDetailModal` в рендер с `onEdit` который устанавливает `editingTask`

## What stays the same

- `TaskDetailModal` — без изменений
- `TaskEditModal` — без изменений
- Все существующие интерактивные элементы продолжают работать как раньше
