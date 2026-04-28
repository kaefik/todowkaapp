# Критика плана исправления синхронизации

**Дата**: 2026-04-28
**Документ**: `docs/plans/2026-04-28-sync-error.md`
**Критик**: plan-critic (автоматический)

Все 10 утверждений плана верифицированы по исходному коду — **подтверждены**.

---

## Step 1 — Five Lenses of Critique

### Lens 1: Completeness

| # | Проблема | Серьёзность |
|---|----------|-------------|
| 1 | **Механизм push не описан.** План говорит «SyncEngine их не отправит» (#2, #3), но не объясняет **почему**. На самом деле `push()` читает **исключительно** из таблицы `mutations` (`syncEngine.ts:410-437`), а не из `_syncStatus` записей. Без мутации — нет push. Это ключевая деталь архитектуры, которую план упускает. | 🟡 WARNING |
| 2 | **`shouldSkipMerge()` не упомянут.** Защита от перезаписи локальных изменений работает через `mutations` таблицу (`conflictResolution.ts:9-18`), а не через `_syncStatus`. Это значит, что запись с `_syncStatus: 'modified'` **но без мутации** будет перезаписана сервером при pull. План этого не учитывает. | 🔴 BLOCKER |
| 3 | **Как создаются мутации?** План нигде не описывает паттерн «создать мутацию в `db.mutations`». Для решения #5 (stop recurrence) и #2/#3 (reorder) нужно не просто «создать мутацию», а детально описать какой `action`, `entityType`, `payload` — или сослаться на существующий паттерн в коде. | 🟡 WARNING |
| 4 | **Checklist items: нет анализа push-стороны.** План описывает pull (создать `GET /checklist`, добавить в `RESOURCES`), но не анализирует: создаются ли мутации для `checklistItem` при локальных изменениях? Если нет — push тоже не работает, и нужно исправлять не только pull. | 🔴 BLOCKER |
| 5 | **Нет тест-плана.** Как проверить что каждое исправление работает? Нет ни одного сценария тестирования. | 🟢 SUGGESTION |
| 6 | **Нет оценки трудозатрат.** План приоритизирован, но нет even приблизительной оценки сложности каждой задачи. | 🟢 SUGGESTION |

### Lens 2: Consistency

| # | Проблема | Серьёзность |
|---|----------|-------------|
| 7 | **Противоречие в решении #2/#3.** План предлагает два варианта: (а) откатывать `_syncStatus` на `'synced'` при ошибке, (б) создавать individual update-мутации. Но вариант (а) **теряет reorder пользователя** — при следующем pull серверная версия (старый порядок) перезапишет локальную, т.к. `mergeRecord()` при `_syncStatus === 'synced'` отдаёт приоритет серверу. План не разрешает это противоречие. | 🔴 BLOCKER |
| 8 | **Reorder verb_templates — пропущен.** План упоминает verb_templates SSE (#4), но reorder для verb_templates (`verb_templates.py:73-82`) тоже не шлёт SSE — как и проекты/области. Однако в решении #4 это не выделено отдельно. | 🟡 WARNING |
| 9 | **«Мёртвый код» batch endpoints (#7).** План предлагает «использовать batch-эндпоинты для массовых операций (оптимизация)» — но это NEW feature, не bugfix. Противоречит разделу YAGNI: зачем оптимизировать то, что не используется? | 🟢 SUGGESTION |

### Lens 3: Assumptions & Risks

| # | Допущение | Риск | Серьёзность |
|---|-----------|------|-------------|
| 10 | «`removeServerDeleted()` с guard 50% достаточно» | Guard срабатывает при `serverIds.size === 0` (ранний return). Но что если сервер вернул **пустой результат из-за ошибки** (не 0, а просто неполные данные)? 50% guard спасёт только если удалено >50%. Если сервер «потерял» 40% данных — они удалятся локально. | 🟡 WARNING |
| 11 | «SSE-события доходят надёжно» | План добавляет SSE туда, где их нет. Но SSE — fire-and-forget (EventBus использует `asyncio.Queue(maxsize=50)`). При переполнении очереди старые события теряются. План не оценивает: достаточно ли periodic pull как fallback? | 🟢 SUGGESTION |
| 12 | «`last-write-wins` по `updatedAt` достаточно для reorder» | При одновременном reorder на двух устройствах побеждает поздний. Но `updatedAt` обновляется на **клиенте** (new Date().toISOString()), а не на сервере. Часы устройств могут расходиться. | 🟡 WARNING |
| 13 | «Создание `GET /checklist` — простая задача» | Нужно проверить: есть ли `service`-слой для глобального запроса чеклистов? Или нужен новый метод в сервисе? Есть ли `schema` для ответа? План не анализирует готовность бэкенда. | 🟡 WARNING |

### Lens 4: YAGNI & Scope Creep

| # | Проблема | Серьёзность |
|---|----------|-------------|
| 14 | **#7 (batch endpoints) — не bug, а оптимизация.** Frontend работает без них. Это Phase 2. | 🟢 SUGGESTION |
| 15 | **#8 (tag endpoints) — cleanup, не sync-проблема.** Можно вынести в отдельный ticket. | 🟢 SUGGESTION |
| 16 | **#6 (мёртвые SSE-слушатели) — косметика.** Не влияет на синхронизацию, `task_updated` уже покрывает все случаи. Стоит сделать, но не в рамках sync-fix. | 🟢 SUGGESTION |

### Lens 5: Technical Feasibility

| # | Проблема | Серьёзность |
|---|----------|-------------|
| 17 | **Решение #2/#3 (reorder): «откат на `synced`» сломает UX.** Если API-вызов reorder не удался (сеть), и мы откатываем `_syncStatus` + sortOrder — пользователь видит, что его reorder «отменился». Это может быть неприемлемо. Правильное решение: **создавать мутации для каждого reordered item** (вариант б), чтобы SyncEngine мог повторить попытку. | 🔴 BLOCKER |
| 18 | **Решение #5 (stop recurrence):payload мутации.** План предлагает payload `{ recurrence_type: null, ... }`. Но `push()` в `syncEngine.ts:440-490` обрабатывает мутации по `action: 'update'` и отправляет на `PUT /tasks/{id}`. Нужно убедиться, что backend `PUT /tasks/{id}` принимает частичный update с null-полями для recurrence. | 🟡 WARNING |
| 19 | **`checklistItem` push: как отправлять?** Текущие мутации для tasks отправляются через `PUT /tasks/{id}` или `POST /tasks`. Но чеклисты вложены: `POST /tasks/{id}/checklist`, `PATCH /tasks/{id}/checklist/{item_id}`. Push handler для `checklistItem` нужно писать с нуля — план это не упоминает. | 🔴 BLOCKER |

---

## Step 2 — Assumption Inversion

### Инверсия 1: «Reorder можно откатить при ошибке»

```
Допущение: При ошибке API можно откатить _syncStatus на 'synced' и вернуть старый sortOrder
Инверсия:  Пользователь теряет reorder — это воспринимается как баг, а не graceful degradation
Impact:    UX-регрессия: пользователь перетащил проект, увидел новый порядок, а через секунду
           всё вернулось. На мобильных соединениях это будет происходить часто.
Mitigation: ВСЕГДА создавать мутации при reorder. При ошибке API — оставлять _syncStatus: 'modified'
            + создавать individual update-мутации для каждого item. SyncEngine отправит при
            появлении сети. Не откатывать sortOrder визуально.
```

### Инверсия 2: «pull-ответ сервера всегда полон»

```
Допущение: removeServerDeleted() получает полный список серверных ID, и если ID нет — запись удалена
Инверсия:  Сервер может вернуть частичный ответ (ошибка БД, таймаут, pagination bug)
Impact:    50% guard спасёт от массового удаления, но при потере 30-49% данных — локальные записи
           будут удалены неправомерно
Mitigation: Использовать ETag/versioning или явный soft-delete с `deleted_at` на сервере.
            Pull должен получать список удалённых ID явно (endpoint /deleted), а не выводить
            удаление из отсутствия в ответе.
```

### Инверсия 3: «checklistItems синхронизируются через pull после добавления в RESOURCES»

```
Допущение: Добавление checklistItem в RESOURCES + GET /checklist решит проблему синхронизации
Инверсия:  Push для checklistItems тоже не работает — нет handler'а в push()
Impact:    Локальные изменения чеклистов (создание, удаление, toggle) никогда не отправятся
           на сервер. Pull будет работать, но push — нет.
Mitigation: Добавить handler для 'checklistItem' в push() (syncEngine.ts), который отправляет
            POST/PUT/DELETE на вложенные эндпоинты /tasks/{taskId}/checklist/...
```

---

## Step 3 — Missing Scenarios

| Сценарий | Риск | Обработка |
|----------|------|-----------|
| **Reorder при offline** — пользователь перетаскивает проекты без сети | 🔴 | Сейчас: `_syncStatus: 'modified'`, нет мутации → навсегда висит. План предлагает откат → теряет reorder. Нужно: мутации. |
| **Checklist item создан локально, потом pull** — SyncEngine pull перезапишет? | 🟡 | `shouldSkipMerge()` проверяет pending mutations. Если мутация создана — pull пропустит. Если нет — сервер перезапишет. План не описывает создание мутаций для checklist. |
| **Два устройства одновременно меняют чеклист одной задачи** | 🟡 | `mergeRecord()` — last-write-wins. Но чеклист-айтемы — это массив, не одна запись. Каждый item — отдельная запись в IndexedDB. Конфликт по item level может быть OK, но не по task level. |
| **Server restart — все SSE-соединения разрываются** | 🟢 | SyncProvider должен переподключаться. Проверить auto-reconnect EventSource. Не описано в плане. |
| **Часы устройств расходятся на N минут** | 🟡 | `updatedAt` выставляется на клиенте (`new Date().toISOString()`). При pull `mergeRecord` сравнивает timestamps. Расхождение часов → некорректный conflict resolution. |
| **Мутация для reorder: 10 проектов = 10 мутаций** | 🟡 | При reorder 10 проектов создаются 10 мутаций `action: 'update'` с `payload: { sort_order: N }`. push() отправит 10 отдельных PUT-запросов. Нужен ли batch? Или это OK? |

---

## Step 4 — Summary Table

| # | Lens | Проблема | Серьёзность | Исправление |
|---|------|----------|-------------|-------------|
| 2 | Completeness | `shouldSkipMerge()` не учтён в анализе | 🔴 BLOCKER | Описать как мутации защищают от перезаписи при pull |
| 4 | Completeness | Checklist push-сторона не проанализирована | 🔴 BLOCKER | Проверить создание мутаций для checklistItem, добавить handler в push() |
| 7 | Consistency | Противоречие: откат vs потеря reorder | 🔴 BLOCKER | Выбрать ОДИН подход: мутации (рекомендуется), не откат |
| 17 | Feasibility | Откат reorder = UX-регресс | 🔴 BLOCKER | Заменить откат на создание мутаций |
| 19 | Feasibility | checklistItem push handler отсутствует | 🔴 BLOCKER | Добавить handler для checklistItem в push() |
| 1 | Completeness | Механизм push (mutations-driven) не описан | 🟡 WARNING | Добавить описание архитектуры |
| 3 | Completeness | Нет паттерна создания мутаций | 🟡 WARNING | Сослаться на существующий код или описать |
| 8 | Consistency | verb_templates reorder пропущен | 🟡 WARNING | Добавить SSE для verb_templates reorder |
| 10 | Risks | removeServerDeleted при неполном ответе | 🟡 WARNING | Рассмотреть явный /deleted endpoint |
| 12 | Risks | Часы устройств расходятся | 🟡 WARNING | Использовать server timestamps |
| 13 | Risks | Готовность бэкенда для GET /checklist | 🟡 WARNING | Проверить service/schema слои |
| 18 | Feasibility | Stop recurrence: частичный update | 🟡 WARNING | Проверить PUT /tasks/{id} |
| 9 | YAGNI | #7 batch — оптимизация, не bugfix | 🟢 SUGGESTION | Вынести в Phase 2 |
| 14 | YAGNI | #7 — не sync-проблема | 🟢 SUGGESTION | Отдельный ticket |
| 15 | YAGNI | #8 — cleanup | 🟢 SUGGESTION | Отдельный ticket |
| 16 | YAGNI | #6 — косметика | 🟢 SUGGESTION | Можно в этом PR, но низкий приоритет |
| 5 | Completeness | Нет тест-плана | 🟢 SUGGESTION | Добавить сценарии проверки |
| 6 | Completeness | Нет оценки трудозатрат | 🟢 SUGGESTION | Добавить hours/complexity |

---

## Verdict

```
VERDICT: 🟡 CONDITIONAL — исправить 5 блокеров, затем приступать
```

### Что исправить перед реализацией:

1. **Заменить решение «откат _syncStatus» на «создание мутаций»** для reorder (#2, #3). Откат — это потеря пользовательских данных. Правильный подход: при optimistic update создавать individual `update`-мутации для каждого item, чтобы SyncEngine мог повторить отправку.

2. **Добавить анализ push-стороны для checklistItem.** Pull — половина решения. Нужно: (а) убедиться что локальные операции с чеклистами создают мутации с `entityType: 'checklistItem'`, (б) добавить handler в `push()` для отправки на вложенные эндпоинты `/tasks/{taskId}/checklist/...`.

3. **Описать паттерн создания мутаций** — сослаться на конкретные строки в коде где мутации уже создаются (для tasks/projects/etc), чтобы исполнитель понимал шаблон.

4. **Добавить verb_templates reorder SSE** — сейчас пропущен.

5. **Рассмотреть server-side `updatedAt`** вместо client-side для корректного conflict resolution.
