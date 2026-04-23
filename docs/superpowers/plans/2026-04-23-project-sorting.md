# Сортировка проектов — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить DnD перетаскивание и кнопки быстрой сортировки проектов (по имени, дате, задачам) на странице /projects.

**Architecture:** Поле sort_order (integer) добавляется в модель Project (backend) и Dexie-схему (frontend). Порядок синхронизируется через SyncEngine. На фронтенде используется @dnd-kit для drag-and-drop с drag handle иконкой. Выбранный режим сортировки сохраняется в localStorage.

**Tech Stack:** Python/FastAPI/SQLAlchemy/Alembic (backend), React/TypeScript/Dexie/@dnd-kit (frontend)

---

## Task 1: Backend — Add sort_order column to Project model

**Files:**
- Modify: `backend/app/models/project.py`

- [ ] **Step 1: Add sort_order column to Project model**

Add import for `Integer` and add `sort_order` column after `is_active`:

```python
# In imports (line 4), change:
from sqlalchemy import DateTime, ForeignKey, String, func
# to:
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func

# After line 19 (is_active), add:
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/models/project.py
git commit -m "feat: add sort_order column to Project model"
```

---

## Task 2: Backend — Create Alembic migration for sort_order

**Files:**
- Create: `backend/alembic/versions/<timestamp>_add_sort_order_to_projects.py`

- [ ] **Step 1: Generate migration**

```bash
cd backend && alembic revision --autogenerate -m "add_sort_order_to_projects"
```

- [ ] **Step 2: Verify migration file**

Check the generated file contains:
```python
def upgrade() -> None:
    op.add_column('projects', sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False))

def downgrade() -> None:
    op.drop_column('projects', 'sort_order')
```

- [ ] **Step 3: Run migration**

```bash
cd backend && alembic upgrade head
```

- [ ] **Step 4: Commit**

```bash
git add backend/alembic/
git commit -m "feat: add alembic migration for projects.sort_order"
```

---

## Task 3: Backend — Update Pydantic schemas

**Files:**
- Modify: `backend/app/schemas/project.py`

- [ ] **Step 1: Add sort_order to schemas**

Add `sort_order` field to `ProjectCreate`, `ProjectUpdate`, and `ProjectResponse`:

```python
# In ProjectCreate (after area_id, line 12), add:
    sort_order: int | None = Field(default=None, ge=0)

# In ProjectUpdate (after is_active, line 20), add:
    sort_order: int | None = Field(default=None, ge=0)

# In ProjectResponse (after is_active, line 30), add:
    sort_order: int

# Add new schema after ProjectUpdate (before ProjectResponse):
class ReorderItem(BaseModel):
    id: str = Field(max_length=36)
    sort_order: int = Field(ge=0)

class ProjectReorderRequest(BaseModel):
    items: list[ReorderItem] = Field(min_length=1, max_length=100)
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/schemas/project.py
git commit -m "feat: add sort_order to project schemas + reorder request"
```

---

## Task 4: Backend — Update ProjectService

**Files:**
- Modify: `backend/app/services/project_service.py`

- [ ] **Step 1: Update get_projects to sort by sort_order**

In `get_projects` method, change the `.order_by(Project.created_at.desc())` to `.order_by(Project.sort_order.asc(), Project.created_at.desc())`:

```python
# Line 58, change:
            .order_by(Project.created_at.desc())
# to:
            .order_by(Project.sort_order.asc(), Project.created_at.desc())
```

- [ ] **Step 2: Update create_project to assign sort_order**

In `create_project` method, after `area_id=data.area_id,` add sort_order logic:

```python
# After line 96 (area_id=data.area_id,), add:
# Before creating project, calculate next sort_order
        if data.sort_order is not None:
            project.sort_order = data.sort_order  # this will be set below
```

Actually, set it in the Project constructor. Change the `Project(...)` creation block to:

```python
        project = Project(
            id=data.id if data.id else str(uuid_mod.uuid4()),
            user_id=str(user_id),
            name=data.name,
            description=data.description,
            color=data.color,
            area_id=data.area_id,
        )
        if data.sort_order is not None:
            project.sort_order = data.sort_order
        else:
            max_result = await self.db.execute(
                select(func.coalesce(func.max(Project.sort_order), -1)).where(Project.user_id == user_id)
            )
            project.sort_order = (max_result.scalar() or -1) + 1
```

- [ ] **Step 3: Add reorder_projects method**

Add new method at end of class (before `get_project_tasks`):

```python
    async def reorder_projects(self, user_id: UUID, items: list[dict]) -> None:
        project_ids = [item['id'] for item in items]
        result = await self.db.execute(
            select(Project).where(
                Project.id.in_(project_ids),
                Project.user_id == user_id,
            )
        )
        projects = {p.id: p for p in result.scalars().all()}

        for item in items:
            project = projects.get(item['id'])
            if project:
                project.sort_order = item['sort_order']

        await self.db.flush()
```

- [ ] **Step 4: Update list_projects to include sort_order in response construction**

In `backend/app/api/projects.py`, the `list_projects` endpoint manually constructs `ProjectDetailResponse`. Add `sort_order=project.sort_order,` to both `list_projects` and `get_project` endpoints.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/project_service.py
git commit -m "feat: sort projects by sort_order, add reorder method"
```

---

## Task 5: Backend — Update API routes + add reorder endpoint

**Files:**
- Modify: `backend/app/api/projects.py`

- [ ] **Step 1: Import new schemas**

Add `ProjectReorderRequest` to imports:

```python
from app.schemas.project import (
    ProjectCreate,
    ProjectDetailResponse,
    ProjectListResponse,
    ProjectReorderRequest,
    ProjectResponse,
    ProjectUpdate,
)
```

- [ ] **Step 2: Add sort_order to response construction in list_projects**

In `list_projects` endpoint, add `sort_order` to the `ProjectDetailResponse` construction:

```python
        items.append(
            ProjectDetailResponse(
                id=project.id,
                user_id=project.user_id,
                area_id=project.area_id,
                name=project.name,
                description=project.description,
                color=project.color,
                is_active=project.is_active,
                sort_order=project.sort_order,
                created_at=project.created_at,
                updated_at=project.updated_at,
                progress=progress,
            )
        )
```

- [ ] **Step 3: Add sort_order to response in get_project**

Same change in the `get_project` endpoint's `ProjectDetailResponse` construction (add `sort_order=project.sort_order,`).

- [ ] **Step 4: Add reorder endpoint**

Add new endpoint after `delete_project` and before `get_project_tasks`:

```python
@projects_router.put("/reorder", response_model=dict)
async def reorder_projects(
    data: ProjectReorderRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    service = ProjectService(db)
    items = [{"id": item.id, "sort_order": item.sort_order} for item in data.items]
    await service.reorder_projects(user_id=current_user.id, items=items)
    return {"ok": True}
```

**IMPORTANT:** This endpoint MUST be placed BEFORE the `/{project_id}` routes, otherwise FastAPI will try to match "reorder" as a project_id.

- [ ] **Step 5: Verify backend starts**

```bash
cd backend && python -c "from app.main import app; print('OK')"
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/projects.py
git commit -m "feat: add PUT /projects/reorder endpoint"
```

---

## Task 6: Frontend — Add sortOrder to Dexie schema

**Files:**
- Modify: `frontend/src/db/database.ts`

- [ ] **Step 1: Add sortOrder to DbProject interface**

In `DbProject` interface (after `isActive: boolean,`), add:

```typescript
  sortOrder: number
```

- [ ] **Step 2: Add Dexie version 2 with sortOrder migration**

After `this.version(1).stores({...})` block, add:

```typescript
    this.version(2).stores({
      projects: 'id, userId, areaId, _syncStatus, updatedAt, sortOrder',
    }).upgrade(tx => {
      return tx.table('projects').toCollection().modify(project => {
        project.sortOrder = 0
      })
    })
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/db/database.ts
git commit -m "feat: add sortOrder to DbProject, bump Dexie schema to v2"
```

---

## Task 7: Frontend — Update SyncEngine for sort_order mapping

**Files:**
- Modify: `frontend/src/db/syncEngine.ts`

- [ ] **Step 1: Add sortOrder to pull transform for projects**

In the projects transform function (around line 34), add `sortOrder` mapping:

```typescript
    transform: makeTransform((item, userId) => ({
      id: item.id as string,
      userId,
      name: item.name as string,
      description: (item.description as string | null) ?? null,
      color: (item.color as string | null) ?? null,
      areaId: (item.area_id as string | null) ?? null,
      isActive: (item.is_active as boolean) ?? true,
      sortOrder: (item.sort_order as number) ?? 0,
      createdAt: (item.created_at as string) ?? new Date().toISOString(),
      updatedAt: (item.updated_at as string) ?? new Date().toISOString(),
      _syncStatus: 'synced' as SyncStatus,
      _lastSyncedAt: new Date().toISOString(),
    })),
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/db/syncEngine.ts
git commit -m "feat: map sort_order in SyncEngine pull transform"
```

---

## Task 8: Frontend — Update useProjects hook

**Files:**
- Modify: `frontend/src/hooks/useProjects.ts`

- [ ] **Step 1: Add sort_order to Project interface and CreateProject**

In `Project` interface, add after `updated_at`:

```typescript
  sort_order: number
```

In `CreateProject` interface, add after `area_id`:

```typescript
  sort_order?: number
```

In `UpdateProject` interface, add after `is_active`:

```typescript
  sort_order?: number
```

- [ ] **Step 2: Update useDexieQuery to sort by sortOrder and include sortOrder in results**

In the `useDexieQuery` callback, after `const records = await activeTable(...)`, add sort and include sortOrder:

```typescript
      const records = await activeTable(db.projects, user.id).toArray()
      records.sort((a, b) => a.sortOrder - b.sortOrder)
```

And in the `results.push({...})` block, add:

```typescript
          sort_order: p.sortOrder,
```

- [ ] **Step 3: Add sortOrder to addProject**

In `addProject`, after `isActive: true,`, add `sortOrder`:

```typescript
        const existingProjects = await activeTable(db.projects, user.id).toArray()
        const maxSortOrder = existingProjects.reduce((max, p) => Math.max(max, p.sortOrder), -1)
        await db.projects.add({
          id,
          userId: user.id,
          name: data.name,
          description: data.description ?? null,
          color: data.color ?? null,
          areaId: data.area_id ?? null,
          isActive: true,
          sortOrder: data.sort_order ?? (maxSortOrder + 1),
          createdAt: now,
          updatedAt: now,
          _syncStatus: 'local',
          _lastSyncedAt: null,
        })
```

- [ ] **Step 4: Add sortOrder to updateProject mapping**

In `updateProject`, add after the `is_active` mapping:

```typescript
    if (data.sort_order !== undefined) updates.sortOrder = data.sort_order
```

- [ ] **Step 5: Add reorderProjects function**

Add new exported function after the `useProjects` hook:

```typescript
export async function reorderProjects(items: { id: string; sort_order: number }[]): Promise<void> {
  const user = useAuthStore.getState().user
  if (!user) return

  for (const item of items) {
    await db.projects.update(item.id, {
      sortOrder: item.sort_order,
      updatedAt: new Date().toISOString(),
      _syncStatus: 'modified',
    })
  }

  await db.mutations.add({
    id: uuidv4(),
    entityType: 'project',
    entityId: 'batch-reorder',
    action: 'update',
    payload: JSON.stringify({ _reorder: items }),
    timestamp: Date.now(),
    retryCount: 0,
    lastError: null,
  })

  try {
    const { httpClient } = await import('../api/httpClient')
    await httpClient.put('/projects/reorder', {
      items: items.map(i => ({ id: i.id, sort_order: i.sort_order })),
    })
    for (const item of items) {
      await db.projects.update(item.id, {
        _syncStatus: 'synced',
        _lastSyncedAt: new Date().toISOString(),
      })
    }
    await db.mutations.where('entityId').equals('batch-reorder').delete()
  } catch {
    // will be retried via sync engine
  }
}
```

- [ ] **Step 6: Add autoSortProjects function**

```typescript
export type SortMode = 'name' | 'date' | 'tasks'

export function autoSortProjects(
  projects: Project[],
  mode: SortMode
): { id: string; sort_order: number }[] {
  const sorted = [...projects]
  switch (mode) {
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
      break
    case 'date':
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      break
    case 'tasks':
      sorted.sort((a, b) => b.progress.tasks_total - a.progress.tasks_total)
      break
  }
  return sorted.map((p, i) => ({ id: p.id, sort_order: i }))
}
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/hooks/useProjects.ts
git commit -m "feat: add sort_order support to useProjects, reorderProjects, autoSortProjects"
```

---

## Task 9: Frontend — Install @dnd-kit

- [ ] **Step 1: Install packages**

```bash
cd frontend && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities --legacy-peer-deps
```

- [ ] **Step 2: Verify installation**

```bash
cd frontend && npx tsc --noEmit
```

---

## Task 10: Frontend — Update Projects.tsx with DnD and sort panel

**Files:**
- Modify: `frontend/src/routes/Projects.tsx`

- [ ] **Step 1: Add imports**

Add at the top of the file:

```typescript
import { useState, useEffect } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilable'
import { useProjects, reorderProjects, autoSortProjects, type SortMode } from '../hooks/useProjects'
```

Note: Keep existing imports for `useState` (it's already imported), `useNavigate`, `useForm`, `Controller`, `zodResolver`, `z`, `ColorPickerField`.

- [ ] **Step 2: Add useLocalStorage inline or import**

Add a simple localStorage helper:

```typescript
function getStoredSortMode(): SortMode | null {
  try {
    return localStorage.getItem('projects_sort_mode') as SortMode | null
  } catch { return null }
}

function storeSortMode(mode: SortMode | null) {
  try {
    if (mode) localStorage.setItem('projects_sort_mode', mode)
    else localStorage.removeItem('projects_sort_mode')
  } catch {}
}
```

- [ ] **Step 3: Create SortableProjectCard component**

Create a sortable wrapper around the existing `ProjectCard`:

```typescript
function SortableProjectCard({
  project,
  onEdit,
  onDelete,
  onClick,
}: {
  project: Project
  onEdit: (project: Project) => void
  onDelete: (id: string) => void
  onClick: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1 flex-shrink-0 focus:outline-none"
        aria-label="Перетащить"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="3" r="1.5" />
          <circle cx="11" cy="3" r="1.5" />
          <circle cx="5" cy="8" r="1.5" />
          <circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="13" r="1.5" />
          <circle cx="11" cy="13" r="1.5" />
        </svg>
      </button>
      <div className="flex-1">
        <ProjectCard project={project} onEdit={onEdit} onDelete={onDelete} onClick={onClick} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create SortPanel component**

```typescript
const SORT_OPTIONS: { mode: SortMode; label: string }[] = [
  { mode: 'name', label: 'По имени' },
  { mode: 'date', label: 'По дате' },
  { mode: 'tasks', label: 'По задачам' },
]

function SortPanel({ activeMode, onSort }: { activeMode: SortMode | null; onSort: (mode: SortMode) => void }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-gray-400 dark:text-gray-500 mr-1">Сортировка:</span>
      {SORT_OPTIONS.map(opt => (
        <button
          key={opt.mode}
          onClick={() => onSort(opt.mode)}
          className={`px-2 py-1 text-xs rounded-md transition-colors ${
            activeMode === opt.mode
              ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Update ProjectsContent with DnD and sort panel**

Replace the `ProjectsContent` function with updated version that:
1. Adds `sortMode` state from localStorage
2. Wraps project list in `DndContext` + `SortableContext`
3. Uses `SortableProjectCard` instead of `ProjectCard`
4. Handles `onDragEnd` to reorder projects
5. Adds `SortPanel` above the project list
6. Handles auto-sort button clicks

Key additions to `ProjectsContent`:

```typescript
function ProjectsContent() {
  const navigate = useNavigate()
  const { projects, isLoading, error, addProject, updateProject, deleteProject, refetch } = useProjects()
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode | null>(getStoredSortMode)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = projects.findIndex(p => p.id === active.id)
    const newIndex = projects.findIndex(p => p.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = [...projects]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)

    const items = reordered.map((p, i) => ({ id: p.id, sort_order: i }))
    await reorderProjects(items)
    setSortMode(null)
    storeSortMode(null)
  }

  const handleAutoSort = async (mode: SortMode) => {
    const items = autoSortProjects(projects, mode)
    await reorderProjects(items)
    setSortMode(mode)
    storeSortMode(mode)
  }

  // rest of the handlers (handleCreate, handleUpdate, handleDelete, handleClickProject) stay the same
  // ... (keep existing handlers unchanged)

  // In the JSX, replace the <div className="space-y-3"> project list with:
  // (see Step 6)
}
```

- [ ] **Step 6: Replace project list JSX with DnD version**

Replace the `<div className="space-y-3">` block at the end of ProjectsContent return with:

```tsx
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {projects.map((project) => (
              <SortableProjectCard
                key={project.id}
                project={project}
                onEdit={setEditingProject}
                onDelete={handleDelete}
                onClick={handleClickProject}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
```

And add SortPanel between the header and the project list:

```tsx
      {projects.length > 1 && (
        <SortPanel activeMode={sortMode} onSort={handleAutoSort} />
      )}
```

This should go after the error block and before the DndContext.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/routes/Projects.tsx
git commit -m "feat: add DnD reordering and sort panel to projects page"
```

---

## Task 11: Frontend — Verify build and lint

- [ ] **Step 1: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 2: Run ESLint**

```bash
cd frontend && npm run lint
```

- [ ] **Step 3: Fix any errors**

Fix TypeScript and lint errors if any.

---

## Task 12: Update docs/features.md

**Files:**
- Modify: `docs/features.md`

- [ ] **Step 1: Add feature entry**

Add under "Управление задачами" or create a new "Управление проектами" section:

```markdown
#### Управление проектами — Сортировка ✅ (Реализовано 23.04.2026)
- Drag-and-drop перетаскивание проектов для ручной сортировки (иконка-ручка ≡)
- Быстрая авто-сортировка по кнопкам: по имени (А→Я), по дате (новые→старые), по задачам (больше→меньше)
- Выбранный режим сортировки сохраняется в localStorage между сессиями
- Порядок проектов (sort_order) хранится в модели данных и синхронизируется между устройствами
- API: PUT /api/projects/reorder — пакетное обновление порядка
- Поле sort_order в модели Project (Integer, default=0)
- Библиотека: @dnd-kit/core + @dnd-kit/sortable
- Файлы: `backend/app/models/project.py`, `backend/app/schemas/project.py`, `backend/app/services/project_service.py`, `backend/app/api/projects.py`, `frontend/src/db/database.ts`, `frontend/src/db/syncEngine.ts`, `frontend/src/hooks/useProjects.ts`, `frontend/src/routes/Projects.tsx`
```

- [ ] **Step 2: Commit**

```bash
git add docs/features.md
git commit -m "docs: add project sorting feature to features.md"
```
