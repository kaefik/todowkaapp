# Критика плана v2: Android App Todowka

**Дата**: 2026-05-22
**Документ**: `docs/plans/2026-05-22-androidapp.md` (после исправлений из первого раунда)
**Раунд**: 2 (повторная критика)

---

## Сводная таблица

| # | Линза | Проблема | Серьёзность | Исправление |
|---|-------|----------|-------------|-------------|
| 1 | Полнота | TaskTagCrossRef не содержит user_id — orphaned records при logout | 🔴 BLOCKER | Добавить user_id + ForeignKey CASCADE |
| 2 | Согласованность | `Result<T>` конфликтует с `kotlin.Result` | 🟡 WARNING | Переименовать в `AppResult<T>` |
| 3 | Согласованность | Koin 4.2.1 + Compose BOM 2026.05.01 — не проверена совместимость | 🟡 WARNING | Верифицировать при setup |
| 4 | Полнота | Не описана синхронизация M:N task-tag связей | 🟡 WARNING | Уточнить: tags внутри TaskResponse, upsert при pull |
| 5 | Полнота | Нет batch limit для push мутаций | 🟢 SUGGESTION | Max 50 mutations per push batch |
| 6 | Полнота | Нет упоминания google-services.json для FCM | 🟡 WARNING | Добавить Firebase setup в Build секцию |
| 7 | Согласованность | Login response: нужно ДОБАВИТЬ токены к TokenResponse, не заменять | 🟡 WARNING | Уточнить формат: `{...existing, access_token, refresh_token}` |
| 8 | Риски | Нет rollback для failed initial sync | 🟡 WARNING | Loading state пока sync не завершён + retry |
| 9 | Полнота | Нет logging/crash reporting стратегии | 🟢 SUGGESTION | Timber для logging |
| 10 | Согласованность | "Бэкенд: Bearer token" внутри Android Phase 1 | 🟡 WARNING | Вынести в Phase 0 |

---

## 🔴 BLOCKER #1: TaskTagCrossRef без user_id

**Секция 3.1**: `TaskTagCrossRef` указан с PK `taskId, tagId` и isolation "через TaskEntity".

Проблема: при `DELETE FROM tasks WHERE user_id = :userId` при logout — TaskTagCrossRef не удалится, т.к. в ней нет user_id. Room ForeignKeys без явного `onDelete = CASCADE` не сработают автоматически для составных PK.

**Исправление**: Добавить `user_id` в TaskTagCrossRef:
```
TaskTagCrossRef | taskId, tagId | user_id | user_id | —
```
+ ForeignKeys с `onDelete = CASCADE` для task_id → tasks.id и tag_id → tags.id.

---

## Вердикт

```
VERDICT: ✅ APPROVED — с одним обязательным исправлением
```

План готов к реализации после исправления BLOCKER #1. Все warnings — желательны, но не блокируют старт.

**Первый раунд критики**: 3 blocker, 8 warnings — все исправлены.
**Второй раунд**: 1 blocker (minor), 7 warnings — план значительно лучше.
