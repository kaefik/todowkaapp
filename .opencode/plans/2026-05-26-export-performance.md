# Оптимизация экспорта данных: StreamingResponse и устранение таймаутов

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Устранить таймауты и обрывы связи при экспорте больших объёмов данных через переход на StreamingResponse, оптимизацию SQL-запросов и увеличение таймаутов Nginx.

**Architecture:** Бекенд переключается с одномоментной сборки всего JSON в памяти на потоковую генерацию через `StreamingResponse`. Фронтенд скачивает файл напрямую как binary blob, а не через JSON-оболочку. SQL-запросы оптимизируются: теги задач загружаются одним запросом вместо N+1 через lazy-loading relationship.

**Tech Stack:** FastAPI StreamingResponse, SQLAlchemy 2.0 async, React fetch + Blob, Nginx proxy config.

---

## Файлы для изменения

| Файл | Действие | Ответственность |
|------|----------|-----------------|
| `backend/app/services/export_import_service.py` | Модификация | Оптимизация SQL-запросов, streaming генератор |
| `backend/app/api/export_import.py` | Модификация | StreamingResponse вместо JSON-оболочки |
| `frontend/src/api/exportImport.ts` | Модификация | Скачивание binary blob вместо JSON parse |
| `backend/tests/test_export_import.py` | Модификация | Обновление тестов под новый формат ответа |
| `docker/nginx.conf` | Модификация | Увеличение таймаута для экспорта |
| `docker/nginx-http.conf` | Модификация | Увеличение таймаута для экспорта |
| `docker/nginx-ssl.conf` | Модификация | Увеличение таймаута для экспорта |
| `deploy/nginx.conf` | Модификация | Увеличение таймаута для экспорта |

---

## Порядок выполнения

### Task 1: Оптимизация SQL-запросов в export_data

**Files:**
- Modify: `backend/app/services/export_import_service.py:174-259`

**Проблема:** Текущий код загружает теги задач через relationship `t.tags` (lazy='selectin') — это отдельный SELECT для каждой задачи. При 5000+ задач это создаёт серьёзную нагрузку.

**Решение:** Заменить проход `for t in tasks: for tag in t.tags` на один явный запрос к `task_tags` таблице.

- [ ] **Step 1: Добавить noload import и обновить запрос задач**

В начало файла (`export_import_service.py`) добавить в imports:
```python
from sqlalchemy.orm import noload
```

Обновить запрос задач (строка 207-210) на:
```python
tasks_result = await self.db.execute(
    select(Task).where(Task.user_id == uid).options(noload(Task.tags))
)
```

- [ ] **Step 2: Заменить цикл загрузки тегов в export_data()**

Заменить строки 228-231:
```python
task_tags_list = []
for t in tasks:
    for tag in t.tags:
        task_tags_list.append({"task_id": t.id, "tag_id": tag.id})
```

На один запрос:
```python
if task_ids:
    tt_result = await self.db.execute(
        select(task_tags).where(task_tags.c.task_id.in_(task_ids))
    )
    task_tags_list = [
        {"task_id": row.task_id, "tag_id": row.tag_id}
        for row in tt_result.all()
    ]
else:
    task_tags_list = []
```

- [ ] **Step 3: Запустить тесты**

Run: `cd backend && python -m pytest tests/test_export_import.py -v`
Expected: Все тесты PASS (пока ещё старый формат ответа).

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/export_import_service.py
git commit -m "perf: replace N+1 tag loading with single query in export"
```

---

### Task 2: Добавить streaming генератор JSON в ExportImportService

**Files:**
- Modify: `backend/app/services/export_import_service.py`

**Цель:** Создать async генератор, который стримит JSON частями, не загружая всё в память. Старый метод `export_data()` остаётся для BackupScheduleService.

- [ ] **Step 1: Добавить метод stream_export_json в ExportImportService**

После метода `export_data` (после строки 259) добавить:

```python
async def stream_export_json(self, user_id: UUID):
    import json as json_mod

    uid = str(user_id)

    yield '{"version":"1.0","app":"todowka","exported_at":"' + datetime.now(UTC).isoformat() + '","data":{'

    sections = [
        ("areas", Area, _serialize_area),
        ("contexts", Context, _serialize_context),
        ("tags", Tag, _serialize_tag),
        ("verb_templates", VerbTemplate, _serialize_verb_template),
        ("projects", Project, _serialize_project),
        ("calendar_events", CalendarEvent, _serialize_calendar_event),
    ]

    first = True
    for key, model, serializer in sections:
        if not first:
            yield ","
        first = False
        yield '"' + key + '":['
        result = await self.db.execute(select(model).where(model.user_id == uid))
        items = list(result.scalars().all())
        for i, item in enumerate(items):
            if i > 0:
                yield ","
            yield json_mod.dumps(serializer(item), ensure_ascii=False, default=str)
        yield "]"

    yield ',"tasks":'
    tasks_result = await self.db.execute(
        select(Task).where(Task.user_id == uid).options(noload(Task.tags))
    )
    tasks = list(tasks_result.scalars().all())
    task_ids = [t.id for t in tasks]
    yield json_mod.dumps([_serialize_task(t) for t in tasks], ensure_ascii=False, default=str)

    if task_ids:
        cl_result = await self.db.execute(
            select(ChecklistItem).where(ChecklistItem.task_id.in_(task_ids))
        )
        checklist_items = list(cl_result.scalars().all())
    else:
        checklist_items = []
    yield ',"checklist_items":' + json_mod.dumps(
        [_serialize_checklist_item(c) for c in checklist_items], ensure_ascii=False, default=str
    )

    if task_ids:
        rec_result = await self.db.execute(
            select(TaskRecurrence).where(TaskRecurrence.task_id.in_(task_ids))
        )
        task_recurrences = list(rec_result.scalars().all())
    else:
        task_recurrences = []
    yield ',"task_recurrences":' + json_mod.dumps(
        [_serialize_task_recurrence(r) for r in task_recurrences], ensure_ascii=False, default=str
    )

    cal_result = await self.db.execute(
        select(CalendarEvent.id).where(CalendarEvent.user_id == uid)
    )
    event_ids = [row[0] for row in cal_result.all()]

    if event_ids:
        er_result = await self.db.execute(
            select(EventRecurrence).where(EventRecurrence.event_id.in_(event_ids))
        )
        event_recurrences = list(er_result.scalars().all())
    else:
        event_recurrences = []
    yield ',"event_recurrences":' + json_mod.dumps(
        [_serialize_event_recurrence(r) for r in event_recurrences], ensure_ascii=False, default=str
    )

    if task_ids:
        tt_result = await self.db.execute(
            select(task_tags).where(task_tags.c.task_id.in_(task_ids))
        )
        task_tags_list = [
            {"task_id": row.task_id, "tag_id": row.tag_id}
            for row in tt_result.all()
        ]
    else:
        task_tags_list = []
    yield ',"task_tags":' + json_mod.dumps(task_tags_list, ensure_ascii=False, default=str)

    yield "}}"
```

- [ ] **Step 2: Запустить ruff**

Run: `cd backend && python -m ruff check app/services/export_import_service.py`
Expected: Нет ошибок.

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/export_import_service.py
git commit -m "feat: add streaming JSON generator for export"
```

---

### Task 3: Переделать API эндпоинт на StreamingResponse

**Files:**
- Modify: `backend/app/api/export_import.py`

- [ ] **Step 1: Обновить imports и эндпоинт export_data**

Заменить строки 1 и 5:
```python
import json as json_mod  # убрать если json не используется в import_data
```

Добавить import:
```python
from fastapi.responses import StreamingResponse
```

Заменить функцию export_data (строки 20-31) на:
```python
@export_import_router.get("/export")
@limiter.limit(export_limit)
async def export_data(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    service = ExportImportService(db)
    filename = f"todowka_export_{datetime.now(UTC).strftime('%Y-%m-%d')}.json"
    return StreamingResponse(
        service.stream_export_json(user_id=current_user.id),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
```

- [ ] **Step 2: Запустить тесты**

Run: `cd backend && python -m pytest tests/test_export_import.py -v`
Expected: Некоторые тесты FAIL — ожидаемо, формат ответа изменился.

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/export_import.py
git commit -m "feat: switch export endpoint to StreamingResponse"
```

---

### Task 4: Обновить все тесты экспорта/импорта

**Files:**
- Modify: `backend/tests/test_export_import.py`

**Изменения:** Раньше ответ был `{"content": "...", "filename": "..."}` и JSON парсился из `response.json()["content"]`. Теперь ответ — прямой JSON-файл, который парсится из `response.json()` напрямую.

- [ ] **Step 1: Обновить test_export_empty_data (строки 61-77)**

Заменить:
```python
body = response.json()
assert "content" in body
assert "filename" in body
data = json.loads(body["content"])
```
На:
```python
data = response.json()
```

- [ ] **Step 2: Обновить test_export_with_tasks (строка 87)**

Заменить:
```python
data = json.loads(response.json()["content"])
```
На:
```python
data = response.json()
```

- [ ] **Step 3: Обновить test_export_with_related_data (строка 129)**

Заменить:
```python
data = json.loads(response.json()["content"])
```
На:
```python
data = response.json()
```

- [ ] **Step 4: Обновить test_export_with_calendar_events (строка 167)**

Заменить:
```python
data = json.loads(response.json()["content"])
```
На:
```python
data = response.json()
```

- [ ] **Step 5: Обновить test_cross_user_import_creates_with_new_ids (строки 361, 374)**

Заменить:
```python
export_content = export_resp.json()["content"]
```
На:
```python
export_content = json.dumps(export_resp.json())
```

- [ ] **Step 6: Обновить test_roundtrip_with_calendar_events (строка 413)**

Заменить:
```python
export_data = json.loads(export_resp.json()["content"])
```
На:
```python
export_data = export_resp.json()
```

- [ ] **Step 7: Запустить все тесты**

Run: `cd backend && python -m pytest tests/test_export_import.py -v`
Expected: Все тесты PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/tests/test_export_import.py
git commit -m "test: update export tests for StreamingResponse format"
```

---

### Task 5: Обновить фронтенд — скачивание binary blob

**Files:**
- Modify: `frontend/src/api/exportImport.ts`

**Изменения:** Раньше API возвращал JSON `{"content": "...", "filename": "..."}`. Теперь возвращает прямой файл с `Content-Disposition`. Фронтенд получает ответ как blob и скачивает его.

- [ ] **Step 1: Переписать exportData в exportImport.ts**

Заменить весь метод `exportData` (строки 10-45):

```typescript
async exportData(): Promise<void> {
    const { useAuthStore } = await import('../stores/authStore')
    const authStore = useAuthStore.getState()
    const headers: Record<string, string> = {}
    if (authStore.isAuthenticated) {
      headers['X-Requested-With'] = 'XMLHttpRequest'
    }

    const response = await fetch(`${API_BASE_URL}/export-import/export`, {
      method: 'GET',
      headers,
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`)
    }

    const disposition = response.headers.get('Content-Disposition')
    let filename = `todowka_export_${new Date().toISOString().split('T')[0]}.json`
    if (disposition) {
      const match = disposition.match(/filename="?([^";\n]+)"?/)
      if (match) filename = match[1]
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },
```

- [ ] **Step 2: Запустить TypeScript проверку**

Run: `cd frontend && npx tsc --noEmit`
Expected: Нет ошибок.

- [ ] **Step 3: Запустить ESLint**

Run: `cd frontend && npm run lint`
Expected: Нет ошибок.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/exportImport.ts
git commit -m "feat: download export as binary blob from StreamingResponse"
```

---

### Task 6: Увеличить таймауты Nginx для экспорта

**Files:**
- Modify: `docker/nginx.conf`
- Modify: `docker/nginx-http.conf`
- Modify: `docker/nginx-ssl.conf`
- Modify: `deploy/nginx.conf`

**Проблема:** `proxy_read_timeout 60s` обрывает соединение при долгом экспорте.

**Решение:** Добавить отдельный location `/api/export-import/` с `proxy_read_timeout 300s` перед общим `/api/` во всех 4 конфигах. Nginx использует первое совпадение — более длинный префикс `/api/export-import/` приоритетнее `/api/`.

- [ ] **Step 1: Обновить docker/nginx.conf**

Перед `location /api/ {` (строка 45) вставить:
```nginx
    location /api/export-import/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
```

- [ ] **Step 2: Обновить docker/nginx-http.conf**

Перед `location /api/ {` (строка 29) вставить аналогичный блок с `proxy_pass http://backend;`.

- [ ] **Step 3: Обновить docker/nginx-ssl.conf**

Перед `location /api/ {` (строка 57) вставить аналогичный блок с `proxy_pass http://backend;`.

- [ ] **Step 4: Обновить deploy/nginx.conf**

Перед `location /api/ {` (строка 23) вставить:
```nginx
    location /api/export-import/ {
        proxy_pass http://todowka_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
```

- [ ] **Step 5: Commit**

```bash
git add docker/nginx.conf docker/nginx-http.conf docker/nginx-ssl.conf deploy/nginx.conf
git commit -m "ops: increase proxy timeout to 300s for export endpoint"
```

---

### Task 7: Финальная проверка

- [ ] **Step 1: Все backend тесты**

Run: `cd backend && python -m pytest tests/ -v`
Expected: Все PASS.

- [ ] **Step 2: Ruff**

Run: `cd backend && python -m ruff check .`
Expected: Нет ошибок.

- [ ] **Step 3: TypeScript**

Run: `cd frontend && npx tsc --noEmit`
Expected: Нет ошибок.

- [ ] **Step 4: ESLint**

Run: `cd frontend && npm run lint`
Expected: Нет ошибок.

---

## Итого

| Проблема | Решение | Task |
|----------|---------|------|
| N+1 запрос тегов | Один запрос к task_tags | Task 1 |
| Весь JSON в памяти (3x расход) | StreamingResponse — потоковая генерация | Task 2, 3 |
| indent=2 раздувает файл на 30-40% | Compact JSON без indent в streaming | Task 2 |
| Nginx 60s таймаут → 504 | Отдельный location с 300s | Task 6 |
| Фронтенд parse JSON-оболочки | Blob download из StreamingResponse | Task 5 |
| Тесты под старый формат | Обновление всех export-тестов | Task 4 |
