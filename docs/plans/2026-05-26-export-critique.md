# Критика плана: 2026-05-26-export.md

**Дата критики:** 2026-05-26
**Критикуемый документ:** `docs/plans/2026-05-26-export.md`

---

## Step 1 — Пять линз критики

### Lens 1: Completeness (Полнота)

| # | Проблема | Серьёзность |
|---|----------|-------------|
| 1 | **`_serialize_task` (строка 112) всё ещё обращается к `t.tags`** — при добавлении `noload(Task.tags)` в Task 1, relationship `tags` будет `None` или `[]`. Но `_serialize_task` делает `"tag_ids": [tag.id for tag in t.tags]` — в старом методе `export_data()` (оставленном для BackupScheduleService) это вызовет пустой список `[]` вместо реальных тегов. План модифицирует `export_data()` (Task 1), добавляя `noload(Task.tags)`, но не обновляет `_serialize_task`. Это **сломает бэкапы** — `tag_ids` в задачах будет `[]` во всех бэкапах. | 🔴 BLOCKER |
| 2 | **Android-клиент** (`ExportImportApi.kt:14`) использует `suspend fun exportData(): Response<Unit>`. При смене ответа с JSON `{"content": "...", "filename": "..."}` на StreamingResponse с `Content-Disposition: attachment`, Retrofit может не корректно обработать потоковый ответ с типом `Response<Unit>`. План не упоминает Android-клиент вообще. | 🟡 WARNING |
| 3 | **`stream_export_json` не стримит по-настоящему для задач.** Строка 139: `yield json_mod.dumps([_serialize_task(t) for t in tasks], ...)` — сначала собирает ВСЕ задачи в один list, потом сериализует весь list в одну строку, потом yield'ит. Для 5000+ задач это тот же «весь JSON в памяти», только для секции tasks. Настоящий streaming — yield каждой задачи отдельно, как сделано для areas/contexts/tags в цикле строк 127-131. | 🟡 WARNING |
| 4 | **Аналогично checklist_items, task_recurrences, event_recurrences, task_tags** — все собираются в list и сериализуются одним вызовом `json_mod.dumps`. Это не streaming. План заявляет «потоковую генерацию», но на практике полный streaming только для первых 6 секций (areas через calendar_events). | 🟡 WARNING |
| 5 | **Нет обработки ошибки при streaming.** Если SQLAlchemy-сессия закроется или оборвётся соединение с БД во время стриминга — генератор выбросит исключение, но `StreamingResponse` не перехватит его корректно. Клиент получит обрезанный JSON. | 🟢 SUGGESTION |
| 6 | **`Content-Security-Policy` в main.py (строка 80)** содержит `default-src 'self'`. Заголовок `Content-Disposition: attachment` может конфликтовать с CSP для некоторых браузеров. Маловероятно, но стоит проверить. | 🟢 SUGGESTION |
| 7 | **Rate limit `5/minute`** приStreamingResponse — если стриминг длится 2 минуты и пользователь пробует повторить, rate limiter считает по IP, а не по user. При shared IP (корпоративная сеть, VPN) несколько пользователей могут упереться в лимит. Это существующая проблема, не специфичная для этого плана. | 🟢 SUGGESTION |

### Lens 2: Consistency (Согласованность)

| # | Проблема | Серьёзность |
|---|----------|-------------|
| 8 | **Task 1 модифицирует `export_data()`** (старый метод), добавляя `noload(Task.tags)`. Task 2 создаёт `stream_export_json()` с тем же `noload(Task.tags)`. Но Task 1 не упоминает, что это повлияет на `_serialize_task()` → `t.tags` (строка 112), который используется в старом `export_data()`. Планировалось оставить старый метод для BackupScheduleService, но Task 1 ломает его. | 🔴 BLOCKER |
| 9 | **Task 3 Step 1** предлагает `import json as json_mod` — но `json` используется в `import_data()` (строки 56-57: `json.loads(content)`). Нельзя убрать `import json`. Нужно оставить `import json` и для streaming использовать `import json as json_mod` локально внутри метода (что уже сделано в Task 2). Формулировка в Task 3 вводит в заблуждение. | 🟡 WARNING |
| 10 | **Nginx: `proxy_cache_bypass $http_upgrade`** — для export endpoint'а это не нужно (экспорт — это обычный GET, не WebSocket). Копирование полного блока proxy-настроек из `/api/` location включает ненужные настройки. Не ошибка, но нечисто. | 🟢 SUGGESTION |

### Lens 3: Assumptions & Risks (Допущения и риски)

| # | Допущение | Что если нет? | Серьёзность |
|---|-----------|---------------|-------------|
| 11 | `noload(Task.tags)` не влияет на `_serialize_task` | `_serialize_task` обращается к `t.tags` → получит `[]` (empty list при noload) → **старый `export_data()` и бэкапы потеряют tag_ids** | 🔴 BLOCKER |
| 12 | StreamingResponse корректно работает с SQLAlchemy async session | AsyncSession может быть закрыт до завершения генератора (FastAPI dependency lifecycle). `get_db()` делает `yield session` + `commit()` + `close()`. Но `StreamingResponse` начинает стримить ПОСЛЕ того, как dependency отработал — **сессия будет закрыта**. | 🔴 BLOCKER |
| 13 | slowapi rate limiter корректно работает с StreamingResponse | slowapi может не корректно считать запрос, если ответ стримится — зависит от реализации middleware. | 🟢 SUGGESTION |
| 14 | `json_mod.dumps(serializer(item), default=str)` — `default=str` скроет ошибки сериализации | Если сериализатор вернёт объект, который не может быть сериализован (например, datetime), `default=str` превратит его в строку, но это может быть неожиданный формат. | 🟢 SUGGESTION |

### Lens 4: YAGNI & Scope Creep

| # | Проблема | Серьёзность |
|---|----------|-------------|
| 15 | План не предлагает удалить старый `export_data()`. Это правильно — он нужен для BackupScheduleService. Но стоит явно указать, что дублирование логики (2 метода с почти одинаковыми SQL-запросами) — это технический долг, и отметить, что в будущем можно сделать `export_data()` обёрткой над `stream_export_json()`. | 🟢 SUGGESTION |
| 16 | Nginx timeout 300s — это 5 минут. Достаточно ли? При SQLite + 100K задач это может быть мало. Но YAGNI — 300s достаточно для текущих объёмов. | 🟢 SUGGESTION |

### Lens 5: Technical Feasibility (Техническая осуществимость)

| # | Проблема | Серьёзность |
|---|----------|-------------|
| 17 | **AsyncSession lifecycle vs StreamingResponse** — КРИТИЧЕСКАЯ проблема. FastAPI dependency `get_db()` (database.py:48-55) использует `async with AsyncSessionLocal() as session: yield session; await session.commit(); ...; await session.close()`. После выхода из контекстного менеджера сессия закрывается. Но `StreamingResponse` только начинает стримить ПОСЛЕ возврата из обработчика. Это значит: **SQL-запросы в генераторе выполнятся на закрытой сессии → `DetachedInstanceError`**. Нужно либо: (a) отключить auto-commit/expire для этой сессии, (b) вынести streaming за пределы dependency lifecycle, или (c) материализовать все данные до возврата StreamingResponse. | 🔴 BLOCKER |
| 18 | **`_serialize_task` в streaming контексте** — строка 112: `"tag_ids": [tag.id for tag in t.tags]` при `noload(Task.tags)` вернёт `[]`. В Task 2 эта проблема есть: tasks загружены с `noload(Task.tags)`, но `_serialize_task` обращается к `t.tags`. Результат: `tag_ids` всегда `[]` в streaming-экспорте. | 🔴 BLOCKER |
| 19 | **Task 1 Step 2: переменная `task_tags` затеняет импорт.** В текущем коде (строка 228) `task_tags = []` затеняет импорт `from app.models.tag import Tag, task_tags`. Plan повторяет это: `task_tags_list` — корректно, но в `stream_export_json` (строка 180-181) используется `task_tags` из импорта, не локальная переменная. OK, но стоит быть внимательным. | 🟢 SUGGESTION |

---

## Step 2 — Assumption Inversion

### Инверсия 1
```
Допущение: noload(Task.tags) безопасен для _serialize_task
Инверсия:  _serialize_task обращается к t.tags → noload возвращает пустую коллекцию
Влияние:   tag_ids во всех задачах = [] в бэкапах и в streaming-экспорте
Устранение: Варианты:
  (a) Убрать tag_ids из _serialize_task и полагаться только на task_tags
  (b) В stream_export_json загружать теги отдельно и подставлять
  (c) В export_data() НЕ добавлять noload — оставить selectin для старого метода
  Лучший вариант: (a) — task_tags уже содержат все связи, tag_ids избыточен
```

### Инверсия 2
```
Допущение: StreamingResponse работает с async session из FastAPI dependency
Инверсия:  get_db() закрывает сессию после yield — генератор работает на закрытой сессии
Влияние:   DetachedInstanceError / OperationalError при первом await в генераторе
Устранение: Варианты:
  (a) Пре-загрузить все данные до StreamingResponse, стримить из памяти
  (b) Создать отдельную сессию внутри генератора (не через dependency)
  (c) Использовать BackgroundTask или кастомный dependency lifecycle
  Лучший вариант: (a) — предзагрузить данные, стримить сериализацию.
  Это снимает проблему lifecycle и упрощает код.
```

### Инверсия 3
```
Допущение: Streaming даёт значимый выигрыш в памяти
Инверсия:  Основной расход памяти — это SQLAlchemy ORM-объекты, не JSON-строка
Влияние:   Streaming JSON не спасёт от OOM если ORM-объекты занимают 500MB
Устранение: Предзагрузка + немедленная сериализация + удаление ORM-объектов
            (или использование Core-запросов вместо ORM для экспорта)
```

---

## Step 3 — Missing Scenarios

| Сценарий | Риск | Обработка |
|----------|------|-----------|
| AsyncSession закрыт до завершения стриминга | 🔴 | Необходимо гарантировать, что сессия жива на протяжении всего стриминга |
| `_serialize_task` вызывается на объекте с `noload(Task.tags)` | 🔴 | tag_ids = [] — нужно убрать зависимость от relationship или загрузить отдельно |
| Android-клиент `Response<Unit>` + StreamingResponse | 🟡 | Retrofit может не обработать attachment ответ как Unit. Нужна проверка |
| Export middleware / CSP конфликт | 🟢 | Маловероятно, но проверить |
| 100K+ задач — materialisation в памяти | 🟡 | Если предзагрузка (решение инверсии 2), то память та же. Но без indent — файл меньше |
| Тест `test_export_empty_data` проверяет ключи | 🟢 | Обновление в Task 4 покрывает |

---

## Step 4 — Verdict

### Summary Table

| # | Lens | Проблема | Серьёзность | Исправление |
|---|------|----------|-------------|-------------|
| 1 | Completeness | `_serialize_task` обращается к `t.tags`, но noload убирает теги | 🔴 | Убрать `tag_ids` из streaming-экспорта (task_tags уже содержат связи) или загрузить теги отдельно |
| 8 | Consistency | Task 1 ломает старый `export_data()` через noload → бэкапы теряют tag_ids | 🔴 | НЕ добавлять noload в старый `export_data()`, только в `stream_export_json` |
| 11 | Assumptions | noload безопасен | 🔴 | Нет — ломает `_serialize_task` |
| 12 | Assumptions | AsyncSession живёт во время streaming | 🔴 | Нет — get_db() закрывает сессию до завершения стриминга |
| 17 | Feasibility | StreamingResponse + async session lifecycle | 🔴 | Предзагрузить данные в обработчике, стримить сериализацию из memory |
| 18 | Feasibility | `_serialize_task` + noload = пустые tag_ids | 🔴 | Убрать tag_ids из streaming или загрузить теги отдельно |
| 2 | Completeness | Android-клиент не упомянут | 🟡 | Проверить совместимость, возможно обновить Retrofit интерфейс |
| 3 | Completeness | tasks не стримятся по-настоящему | 🟡 | Yield каждую задачу отдельно |
| 4 | Completeness | checklist/recurrences/tags — не streaming | 🟡 | Yield по одному элементу или принять как компромисс |
| 9 | Consistency | `import json` нельзя убрать | 🟡 | Уточнить формулировку в Task 3 |

### Verdict

```
VERDICT: 🔴 NEEDS REVISION

Три BLOCKER'а требуют пересмотра архитектуры:

1. AsyncSession lifecycle: StreamingResponse + async generator не работает
   с FastAPI dependency injection — сессия закрывается до начала стриминга.
   РЕШЕНИЕ: Предзагрузить все данные в обработчике API, затем стримить
   сериализацию из memory через sync generator.

2. noload(Task.tags) ломает _serialize_task: tag_ids всегда [].
   РЕШЕНИЕ: НЕ трогать старый export_data(), в streaming-экспорте
   убрать tag_ids из сериализации (task_tags уже содержит все связи).
   Или: загрузить task_tags отдельным запросом и подставить.

3. Task 1 модифицирует старый export_data(), ломая бэкапы.
   РЕШЕНИЕ: Применить noload только в stream_export_json,
   не трогать старый метод.
```

### Рекомендуемая переработка

1. **Task 1** — откатить: НЕ добавлять noload в старый `export_data()`. Оставить его как есть для BackupScheduleService.

2. **Task 2** — переработать `stream_export_json`:
   - Внутри метода предзагрузить ВСЕ данные в dict-структуры (вызовы БД + сериализация)
   - Вернуть sync generator, который yield'ит JSON-части из предзагруженных данных
   - НЕ использовать `_serialize_task` (он зависит от `t.tags`) — написать `_serialize_task_notags` или убрать `tag_ids`
   - Или: загрузить task_ids→tag_ids маппинг отдельным запросом и подставить в `_serialize_task`

3. **Task 3** — использовать предзагруженные данные:
   ```python
   async def export_data_streaming(...):
       data = await service.preload_export_data(user_id=current_user.id)
       return StreamingResponse(
           _stream_json(data),
           media_type="application/json",
           headers={"Content-Disposition": ...}
       )
   ```
   Где `_stream_json` — sync generator, разбивающий dict на части.
