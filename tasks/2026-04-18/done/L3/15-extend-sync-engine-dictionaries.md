### L3-15 — Расширить syncEngine push/pull для справочников

**Goal:** Добавить обработку projects, areas, contexts, tags в push и pull операции syncEngine.
**Input:** Завершённые L2-03, L3-11..14.
**Output:** Обновлённый `frontend/src/db/syncEngine.ts`.
**Done when:** Push/pull обрабатывают все 5 типов сущностей: tasks, projects, areas, contexts, tags.
**Acceptance criteria:**
- [ ] `initialSync()` загружает все 5 ресурсов: tasks, projects, areas, contexts, tags
- [ ] `pull()` мержит все 5 ресурсов
- [ ] `push()` отправляет мутации для всех entityType: task, project, area, context, tag
- [ ] Push маппит action → HTTP method: create → POST, update → PUT, delete → DELETE, toggle → PATCH toggle, move → PATCH move
- [ ] API endpoints: /tasks, /projects, /areas, /contexts, /tags
**depends_on:** [L2/03, L3/11, L3/12, L3/13, L3/14]
**impact:** 4
**complexity:** 2
**risk:** 2
**priority_score:** 5.0
**Est. effort:** S
