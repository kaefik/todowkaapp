# Verb Quick-Add Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add verb-based quick-add for tasks with desktop chips (focus-triggered) and mobile FAB, synced across devices.

**Architecture:** Backend CRUD for verb_templates table. Frontend offline-first via Dexie + sync engine. Responsive UI with Tailwind breakpoints.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 (async), Alembic, Pydantic v2 (backend) / React 18, TypeScript, Dexie, Tailwind CSS 4 (frontend)

---

## File Structure

### Backend — new files
| File | Responsibility |
|------|---------------|
| `backend/app/models/verb_template.py` | SQLAlchemy model |
| `backend/app/schemas/verb_template.py` | Pydantic schemas |
| `backend/app/services/verb_template_service.py` | Business logic |
| `backend/app/api/verb_templates.py` | API router |
| `backend/alembic/versions/xxx_add_verb_templates_table.py` | Migration |

### Backend — modified files
| File | Change |
|------|--------|
| `backend/app/models/__init__.py` | Export VerbTemplate |
| `backend/app/main.py` | Register router |

### Frontend — new files
| File | Responsibility |
|------|---------------|
| `frontend/src/api/verbTemplates.ts` | API client wrapper |
| `frontend/src/hooks/useVerbTemplates.ts` | Dexie CRUD hook |
| `frontend/src/components/VerbChips.tsx` | Desktop chips component |
| `frontend/src/components/VerbFab.tsx` | Mobile FAB component |
| `frontend/src/components/VerbSettings.tsx` | Settings section component |

### Frontend — modified files
| File | Change |
|------|--------|
| `frontend/src/db/database.ts` | Add DbVerbTemplate, Dexie v3 |
| `frontend/src/db/syncEngine.ts` | Add verbTemplate resource |
| `frontend/src/db/init.ts` | Clear verbTemplates on logout |
| `frontend/src/components/TaskListView.tsx` | Integrate VerbChips + VerbFab |
| `frontend/src/routes/Settings.tsx` | Add "Глаголы" tab |

---

## Task 1: Backend — VerbTemplate model + migration

**Files:**
- Create: `backend/app/models/verb_template.py`
- Modify: `backend/app/models/__init__.py`
- Create: `backend/alembic/versions/xxx_add_verb_templates_table.py`

- [ ] **Step 1: Create the model**

```python
# backend/app/models/verb_template.py
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class VerbTemplate(Base):
    __tablename__ = 'verb_templates'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    text: Mapped[str] = mapped_column(String(30), nullable=False)
    icon: Mapped[str] = mapped_column(String(10), nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship('User', back_populates='verb_templates')
```

- [ ] **Step 2: Register in models/__init__.py**

Add import and export:

```python
from app.models.verb_template import VerbTemplate

# Add to __all__:
__all__ = ['User', 'Task', 'RevokedToken', 'Context', 'Area', 'Tag', 'Project', 'GtdStatus', 'task_tags', 'TaskRecurrence', 'Notification', 'VerbTemplate']
```

- [ ] **Step 3: Add relationship to User model**

In `backend/app/models/user.py`, add to the User class:

```python
verb_templates = relationship('VerbTemplate', back_populates='user', cascade='all, delete-orphan')
```

- [ ] **Step 4: Generate migration**

Run:
```bash
cd backend && alembic revision --autogenerate -m "add verb_templates table"
```

- [ ] **Step 5: Apply migration**

Run:
```bash
cd backend && alembic upgrade head
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/models/verb_template.py backend/app/models/__init__.py backend/app/models/user.py backend/alembic/
git commit -m "feat: add VerbTemplate model and migration"
```

---

## Task 2: Backend — Pydantic schemas

**Files:**
- Create: `backend/app/schemas/verb_template.py`

- [ ] **Step 1: Create schemas**

```python
# backend/app/schemas/verb_template.py
from datetime import datetime

from pydantic import BaseModel, Field


class VerbTemplateCreate(BaseModel):
    text: str = Field(min_length=1, max_length=30)
    icon: str = Field(min_length=1, max_length=10)


class VerbTemplateUpdate(BaseModel):
    text: str | None = Field(default=None, min_length=1, max_length=30)
    icon: str | None = Field(default=None, min_length=1, max_length=10)


class VerbTemplateResponse(BaseModel):
    id: str
    user_id: str
    text: str
    icon: str
    position: int
    created_at: datetime
    updated_at: datetime

    model_config = {'from_attributes': True}


class VerbTemplateListResponse(BaseModel):
    items: list[VerbTemplateResponse]
    total: int


class VerbTemplateReorderRequest(BaseModel):
    ids: list[str] = Field(min_length=1)
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/schemas/verb_template.py
git commit -m "feat: add VerbTemplate Pydantic schemas"
```

---

## Task 3: Backend — VerbTemplate service

**Files:**
- Create: `backend/app/services/verb_template_service.py`

- [ ] **Step 1: Create service**

```python
# backend/app/services/verb_template_service.py
from typing import Annotated
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.verb_template import VerbTemplate
from app.schemas.verb_template import VerbTemplateCreate, VerbTemplateUpdate

DEFAULT_VERBS = [
    {'text': 'Купить', 'icon': '🛒'},
    {'text': 'Сделать', 'icon': '🔨'},
    {'text': 'Проверить', 'icon': '✅'},
    {'text': 'Позвонить', 'icon': '📞'},
    {'text': 'Написать', 'icon': '✉️'},
    {'text': 'Найти', 'icon': '🔍'},
]


class VerbTemplateService:
    def __init__(self, db: Annotated[AsyncSession, "db"]):
        self.db = db

    async def get_verb_templates(
        self, user_id: UUID, limit: int = 100, offset: int = 0
    ) -> tuple[list[VerbTemplate], int]:
        count_q = select(func.count()).select_from(VerbTemplate).where(VerbTemplate.user_id == user_id)
        total = (await self.db.execute(count_q)).scalar() or 0

        q = (
            select(VerbTemplate)
            .where(VerbTemplate.user_id == user_id)
            .order_by(VerbTemplate.position, VerbTemplate.created_at)
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(q)
        items = list(result.scalars().all())
        return items, total

    async def create_verb_template(self, user_id: UUID, data: VerbTemplateCreate) -> VerbTemplate:
        max_pos_q = select(func.coalesce(func.max(VerbTemplate.position), -1)).where(
            VerbTemplate.user_id == user_id
        )
        max_pos = (await self.db.execute(max_pos_q)).scalar() or 0

        verb = VerbTemplate(
            user_id=str(user_id),
            text=data.text,
            icon=data.icon,
            position=max_pos + 1,
        )
        self.db.add(verb)
        await self.db.flush()
        await self.db.refresh(verb)
        return verb

    async def update_verb_template(
        self, user_id: UUID, verb_id: str, data: VerbTemplateUpdate
    ) -> VerbTemplate | None:
        q = select(VerbTemplate).where(
            VerbTemplate.id == verb_id, VerbTemplate.user_id == str(user_id)
        )
        result = await self.db.execute(q)
        verb = result.scalar_one_or_none()
        if not verb:
            return None

        if data.text is not None:
            verb.text = data.text
        if data.icon is not None:
            verb.icon = data.icon
        await self.db.flush()
        await self.db.refresh(verb)
        return verb

    async def delete_verb_template(self, user_id: UUID, verb_id: str) -> bool:
        q = select(VerbTemplate).where(
            VerbTemplate.id == verb_id, VerbTemplate.user_id == str(user_id)
        )
        result = await self.db.execute(q)
        verb = result.scalar_one_or_none()
        if not verb:
            return False
        await self.db.delete(verb)
        await self.db.flush()
        return True

    async def reorder_verb_templates(self, user_id: UUID, ids: list[str]) -> bool:
        for position, verb_id in enumerate(ids):
            q = select(VerbTemplate).where(
                VerbTemplate.id == verb_id, VerbTemplate.user_id == str(user_id)
            )
            result = await self.db.execute(q)
            verb = result.scalar_one_or_none()
            if verb:
                verb.position = position
        await self.db.flush()
        return True

    async def reset_verb_templates(self, user_id: UUID) -> list[VerbTemplate]:
        delete_q = VerbTemplate.__table__.delete().where(VerbTemplate.user_id == str(user_id))
        await self.db.execute(delete_q)
        await self.db.flush()

        verbs = []
        for i, default in enumerate(DEFAULT_VERBS):
            verb = VerbTemplate(
                user_id=str(user_id),
                text=default['text'],
                icon=default['icon'],
                position=i,
            )
            self.db.add(verb)
            verbs.append(verb)
        await self.db.flush()
        for v in verbs:
            await self.db.refresh(v)
        return verbs
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/verb_template_service.py
git commit -m "feat: add VerbTemplateService with CRUD and reset"
```

---

## Task 4: Backend — API router + wire-up

**Files:**
- Create: `backend/app/api/verb_templates.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create API router**

```python
# backend/app/api/verb_templates.py
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.verb_template import (
    VerbTemplateCreate,
    VerbTemplateListResponse,
    VerbTemplateReorderRequest,
    VerbTemplateResponse,
    VerbTemplateUpdate,
)
from app.services.verb_template_service import VerbTemplateService

verb_templates_router = APIRouter(prefix="/verb-templates", tags=["verb-templates"])


@verb_templates_router.get("", response_model=VerbTemplateListResponse)
async def list_verb_templates(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> VerbTemplateListResponse:
    service = VerbTemplateService(db)
    items, total = await service.get_verb_templates(user_id=current_user.id, limit=limit, offset=offset)
    return VerbTemplateListResponse(
        items=[VerbTemplateResponse.model_validate(v) for v in items],
        total=total,
    )


@verb_templates_router.post("", response_model=VerbTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_verb_template(
    data: VerbTemplateCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> VerbTemplateResponse:
    service = VerbTemplateService(db)
    verb = await service.create_verb_template(user_id=current_user.id, data=data)
    return VerbTemplateResponse.model_validate(verb)


@verb_templates_router.put("/{verb_id}", response_model=VerbTemplateResponse)
async def update_verb_template(
    verb_id: str,
    data: VerbTemplateUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> VerbTemplateResponse:
    service = VerbTemplateService(db)
    verb = await service.update_verb_template(user_id=current_user.id, verb_id=verb_id, data=data)
    if not verb:
        raise HTTPException(status_code=404, detail="Verb template not found")
    return VerbTemplateResponse.model_validate(verb)


@verb_templates_router.delete("/{verb_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_verb_template(
    verb_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    service = VerbTemplateService(db)
    deleted = await service.delete_verb_template(user_id=current_user.id, verb_id=verb_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Verb template not found")


@verb_templates_router.put("/reorder", response_model=list[VerbTemplateResponse])
async def reorder_verb_templates(
    data: VerbTemplateReorderRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[VerbTemplateResponse]:
    service = VerbTemplateService(db)
    await service.reorder_verb_templates(user_id=current_user.id, ids=data.ids)
    items, _ = await service.get_verb_templates(user_id=current_user.id)
    return [VerbTemplateResponse.model_validate(v) for v in items]


@verb_templates_router.post("/reset", response_model=list[VerbTemplateResponse])
async def reset_verb_templates(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[VerbTemplateResponse]:
    service = VerbTemplateService(db)
    verbs = await service.reset_verb_templates(user_id=current_user.id)
    return [VerbTemplateResponse.model_validate(v) for v in verbs]
```

- [ ] **Step 2: Register router in main.py**

In `backend/app/main.py`, add import and register:

```python
# Add to imports:
from app.api.verb_templates import verb_templates_router

# Add to create_app(), after other api_router.include_router lines:
api_router.include_router(verb_templates_router)
```

- [ ] **Step 3: Run ruff check**

Run:
```bash
cd backend && ruff check app/models/verb_template.py app/schemas/verb_template.py app/services/verb_template_service.py app/api/verb_templates.py --fix
```

- [ ] **Step 4: Run backend to verify no import errors**

Run:
```bash
cd backend && python -c "from app.main import app; print('OK')"
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/verb_templates.py backend/app/main.py
git commit -m "feat: add VerbTemplate API router and register in app"
```

---

## Task 5: Frontend — Dexie table + types

**Files:**
- Modify: `frontend/src/db/database.ts`
- Modify: `frontend/src/db/init.ts`

- [ ] **Step 1: Add DbVerbTemplate interface and table**

In `frontend/src/db/database.ts`:

Add interface after DbTag:

```typescript
export interface DbVerbTemplate {
  id: string
  userId: string
  text: string
  icon: string
  position: number
  createdAt: string
  updatedAt: string
  _syncStatus: SyncStatus
  _lastSyncedAt: string | null
}
```

Update DbMutation entityType:

```typescript
export interface DbMutation {
  id: string
  entityType: 'task' | 'project' | 'area' | 'context' | 'tag' | 'verbTemplate'
  entityId: string
  action: 'create' | 'update' | 'delete' | 'toggle' | 'move' | 'reorder'
  payload: string | null
  timestamp: number
  retryCount: number
  lastError: string | null
}
```

Add table to TodowkaDB class:

```typescript
export class TodowkaDB extends Dexie {
  tasks!: Table<DbTask>
  projects!: Table<DbProject>
  areas!: Table<DbArea>
  contexts!: Table<DbContext>
  tags!: Table<DbTag>
  verbTemplates!: Table<DbVerbTemplate>
  mutations!: Table<DbMutation>
  syncMeta!: Table<DbSyncMeta>
```

Add version(3) after version(2):

```typescript
    this.version(3).stores({
      verbTemplates: 'id, userId, _syncStatus, updatedAt, position',
    })
```

- [ ] **Step 2: Update init.ts to clear verbTemplates**

In `frontend/src/db/init.ts`, add to `clearLocalData`:

```typescript
export async function clearLocalData(userId: string): Promise<void> {
  await db.tasks.where('userId').equals(userId).delete()
  await db.projects.where('userId').equals(userId).delete()
  await db.areas.where('userId').equals(userId).delete()
  await db.contexts.where('userId').equals(userId).delete()
  await db.tags.where('userId').equals(userId).delete()
  await db.verbTemplates.where('userId').equals(userId).delete()
  await db.mutations.clear()
  await db.syncMeta.clear()
}
```

- [ ] **Step 3: Verify no TypeScript errors**

Run:
```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: errors only in syncEngine.ts (EntityType not yet updated — that's Task 6).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/db/database.ts frontend/src/db/init.ts
git commit -m "feat: add DbVerbTemplate to Dexie schema v3"
```

---

## Task 6: Frontend — API client + Sync engine integration

**Files:**
- Create: `frontend/src/api/verbTemplates.ts`
- Modify: `frontend/src/db/syncEngine.ts`

- [ ] **Step 1: Create API client**

```typescript
// frontend/src/api/verbTemplates.ts
import { httpClient } from './httpClient'

export interface ApiVerbTemplate {
  id: string
  user_id: string
  text: string
  icon: string
  position: number
  created_at: string
  updated_at: string
}

export const verbTemplatesApi = {
  getAll: async (): Promise<ApiVerbTemplate[]> => {
    const response = await httpClient.get<{ items: ApiVerbTemplate[]; total: number }>('/verb-templates')
    return response.data.items
  },

  create: async (data: { text: string; icon: string }): Promise<ApiVerbTemplate> => {
    const response = await httpClient.post<ApiVerbTemplate>('/verb-templates', data)
    return response.data
  },

  update: async (id: string, data: { text?: string; icon?: string }): Promise<ApiVerbTemplate> => {
    const response = await httpClient.put<ApiVerbTemplate>(`/verb-templates/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await httpClient.delete(`/verb-templates/${id}`)
  },

  reorder: async (ids: string[]): Promise<ApiVerbTemplate[]> => {
    const response = await httpClient.put<ApiVerbTemplate[]>('/verb-templates/reorder', { ids })
    return response.data
  },

  reset: async (): Promise<ApiVerbTemplate[]> => {
    const response = await httpClient.post<ApiVerbTemplate[]>('/verb-templates/reset')
    return response.data
  },
}
```

- [ ] **Step 2: Update syncEngine.ts — EntityType**

In `frontend/src/db/syncEngine.ts`, update EntityType:

```typescript
type EntityType = 'task' | 'project' | 'area' | 'context' | 'tag' | 'verbTemplate'
```

- [ ] **Step 3: Update syncEngine.ts — SyncResourceConfig table type**

Update the table union type to include verbTemplates:

```typescript
interface SyncResourceConfig {
  endpoint: string
  table: typeof db.tasks | typeof db.projects | typeof db.areas | typeof db.contexts | typeof db.tags | typeof db.verbTemplates
  entityType: EntityType
  transform: (item: Record<string, unknown>, userId: string) => Record<string, unknown> & { updatedAt: string; _syncStatus: SyncStatus; _lastSyncedAt: string | null }
}
```

- [ ] **Step 4: Update syncEngine.ts — RESOURCES array**

Add after the tags entry:

```typescript
  {
    endpoint: '/verb-templates',
    table: db.verbTemplates,
    entityType: 'verbTemplate',
    transform: makeTransform((item, userId) => ({
      id: item.id as string,
      userId,
      text: item.text as string,
      icon: item.icon as string,
      position: (item.position as number) ?? 0,
      createdAt: (item.created_at as string) ?? new Date().toISOString(),
      updatedAt: (item.updated_at as string) ?? new Date().toISOString(),
      _syncStatus: 'synced' as SyncStatus,
      _lastSyncedAt: new Date().toISOString(),
    })),
  },
```

- [ ] **Step 5: Update syncEngine.ts — getTableForType**

Add case:

```typescript
function getTableForType(entityType: EntityType) {
  switch (entityType) {
    case 'task': return db.tasks
    case 'project': return db.projects
    case 'area': return db.areas
    case 'context': return db.contexts
    case 'tag': return db.tags
    case 'verbTemplate': return db.verbTemplates
  }
}
```

- [ ] **Step 6: Update syncEngine.ts — getEndpointForType**

Add case:

```typescript
function getEndpointForType(entityType: EntityType): string {
  switch (entityType) {
    case 'task': return '/tasks'
    case 'project': return '/projects'
    case 'area': return '/areas'
    case 'context': return '/contexts'
    case 'tag': return '/tags'
    case 'verbTemplate': return '/verb-templates'
  }
}
```

- [ ] **Step 7: Update syncEngine.ts — executeMutation**

Add reorder case after the move case:

```typescript
    case 'reorder': {
      const body = mutation.payload ? JSON.parse(mutation.payload) : {}
      await httpClient.put(`${endpoint}/reorder`, body)
      break
    }
```

- [ ] **Step 8: Verify TypeScript**

Run:
```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 9: Commit**

```bash
git add frontend/src/api/verbTemplates.ts frontend/src/db/syncEngine.ts
git commit -m "feat: add verbTemplate API client and sync engine integration"
```

---

## Task 7: Frontend — useVerbTemplates hook

**Files:**
- Create: `frontend/src/hooks/useVerbTemplates.ts`

- [ ] **Step 1: Create the hook**

```typescript
// frontend/src/hooks/useVerbTemplates.ts
import { useAuthStore } from '../stores/authStore'
import { db, type DbVerbTemplate, activeTable } from '../db/database'
import { useDexieQuery } from '../db/hooks'
import { v4 as uuidv4 } from 'uuid'
import { verbTemplatesApi } from '../api/verbTemplates'

export interface VerbTemplate {
  id: string
  text: string
  icon: string
  position: number
}

const DEFAULT_VERBS: Omit<DbVerbTemplate, 'id' | 'userId' | 'createdAt' | 'updatedAt' | '_syncStatus' | '_lastSyncedAt'>[] = [
  { text: 'Купить', icon: '🛒', position: 0 },
  { text: 'Сделать', icon: '🔨', position: 1 },
  { text: 'Проверить', icon: '✅', position: 2 },
  { text: 'Позвонить', icon: '📞', position: 3 },
  { text: 'Написать', icon: '✉️', position: 4 },
  { text: 'Найти', icon: '🔍', position: 5 },
]

export function useVerbTemplates() {
  const user = useAuthStore(s => s.user)

  const { data: rawTemplates = [], isLoading } = useDexieQuery(
    async () => {
      if (!user) return []
      return activeTable(db.verbTemplates, user.id)
        .sortBy('position')
    },
    [user?.id]
  )

  const templates: VerbTemplate[] = rawTemplates.map(t => ({
    id: t.id,
    text: t.text,
    icon: t.icon,
    position: t.position,
  }))

  const ensureDefaults = async () => {
    if (!user) return
    const existing = await db.verbTemplates.where('userId').equals(user.id).count()
    if (existing > 0) return

    for (const def of DEFAULT_VERBS) {
      const id = uuidv4()
      const now = new Date().toISOString()
      await db.verbTemplates.add({
        id,
        userId: user.id,
        text: def.text,
        icon: def.icon,
        position: def.position,
        createdAt: now,
        updatedAt: now,
        _syncStatus: 'local',
        _lastSyncedAt: null,
      })
      await db.mutations.add({
        id: uuidv4(),
        entityType: 'verbTemplate',
        entityId: id,
        action: 'create',
        payload: JSON.stringify({ text: def.text, icon: def.icon }),
        timestamp: Date.now(),
        retryCount: 0,
        lastError: null,
      })
    }
  }

  const addVerb = async (text: string, icon: string) => {
    if (!user) return
    const id = uuidv4()
    const now = new Date().toISOString()
    const maxPos = await db.verbTemplates
      .where('userId').equals(user.id)
      .filter(t => t._syncStatus !== 'deleted')
      .sortBy('position')
      .then(arr => arr.length > 0 ? arr[arr.length - 1].position + 1 : 0)

    await db.verbTemplates.add({
      id,
      userId: user.id,
      text,
      icon,
      position: maxPos,
      createdAt: now,
      updatedAt: now,
      _syncStatus: 'local',
      _lastSyncedAt: null,
    })
    await db.mutations.add({
      id: uuidv4(),
      entityType: 'verbTemplate',
      entityId: id,
      action: 'create',
      payload: JSON.stringify({ text, icon }),
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })
  }

  const updateVerb = async (id: string, data: { text?: string; icon?: string }) => {
    if (!user) return
    await db.verbTemplates.update(id, {
      ...data,
      updatedAt: new Date().toISOString(),
      _syncStatus: 'modified',
    })
    await db.mutations.add({
      id: uuidv4(),
      entityType: 'verbTemplate',
      entityId: id,
      action: 'update',
      payload: JSON.stringify(data),
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })
  }

  const deleteVerb = async (id: string) => {
    if (!user) return
    await db.verbTemplates.update(id, {
      _syncStatus: 'deleted',
      updatedAt: new Date().toISOString(),
    })
    await db.mutations.add({
      id: uuidv4(),
      entityType: 'verbTemplate',
      entityId: id,
      action: 'delete',
      payload: null,
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })
  }

  const reorderVerbs = async (ids: string[]) => {
    if (!user) return
    for (let i = 0; i < ids.length; i++) {
      await db.verbTemplates.update(ids[i], {
        position: i,
        updatedAt: new Date().toISOString(),
        _syncStatus: 'modified',
      })
    }
    await db.mutations.add({
      id: uuidv4(),
      entityType: 'verbTemplate',
      entityId: 'reorder',
      action: 'reorder',
      payload: JSON.stringify({ ids }),
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })
  }

  const resetVerbs = async () => {
    if (!user) return
    try {
      const result = await verbTemplatesApi.reset()
      await db.verbTemplates.where('userId').equals(user.id).delete()
      for (const v of result) {
        await db.verbTemplates.put({
          id: v.id,
          userId: user.id,
          text: v.text,
          icon: v.icon,
          position: v.position,
          createdAt: v.created_at,
          updatedAt: v.updated_at,
          _syncStatus: 'synced',
          _lastSyncedAt: new Date().toISOString(),
        })
      }
    } catch {
      const all = await db.verbTemplates.where('userId').equals(user.id).toArray()
      for (const v of all) {
        await deleteVerb(v.id)
      }
      await ensureDefaults()
    }
  }

  return {
    templates,
    isLoading,
    ensureDefaults,
    addVerb,
    updateVerb,
    deleteVerb,
    reorderVerbs,
    resetVerbs,
  }
}
```

- [ ] **Step 2: Verify TypeScript**

Run:
```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useVerbTemplates.ts
git commit -m "feat: add useVerbTemplates hook with offline-first CRUD"
```

---

## Task 8: Frontend — VerbChips component (Desktop)

**Files:**
- Create: `frontend/src/components/VerbChips.tsx`

- [ ] **Step 1: Create VerbChips**

```tsx
// frontend/src/components/VerbChips.tsx
import { useState } from 'react'
import type { VerbTemplate } from '../hooks/useVerbTemplates'

interface VerbChipsProps {
  templates: VerbTemplate[]
  activeVerb: string | null
  onSelect: (verb: VerbTemplate | null) => void
  onAddNew: () => void
}

export function VerbChips({ templates, activeVerb, onSelect, onAddNew }: VerbChipsProps) {
  const [showAddInput, setShowAddInput] = useState(false)
  const [newVerbText, setNewVerbText] = useState('')

  const handleChipClick = (template: VerbTemplate) => {
    if (activeVerb === template.id) {
      onSelect(null)
    } else {
      onSelect(template)
    }
  }

  const handleAddSubmit = () => {
    const text = newVerbText.trim()
    if (!text) return
    onAddNew()
    setNewVerbText('')
    setShowAddInput(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-gray-100 dark:border-gray-700">
      {templates.map((template) => (
        <button
          key={template.id}
          type="button"
          onClick={() => handleChipClick(template)}
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            activeVerb === template.id
              ? 'bg-indigo-600 dark:bg-indigo-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <span>{template.icon}</span>
          <span>{template.text}</span>
        </button>
      ))}
      {showAddInput ? (
        <form
          onSubmit={(e) => { e.preventDefault(); handleAddSubmit() }}
          className="inline-flex items-center gap-1"
        >
          <input
            type="text"
            value={newVerbText}
            onChange={(e) => setNewVerbText(e.target.value)}
            placeholder="глагол"
            maxLength={30}
            autoFocus
            onBlur={() => { if (!newVerbText.trim()) setShowAddInput(false) }}
            className="w-20 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddInput(true)}
          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          + ещё
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/VerbChips.tsx
git commit -m "feat: add VerbChips desktop component"
```

---

## Task 9: Frontend — VerbFab component (Mobile)

**Files:**
- Create: `frontend/src/components/VerbFab.tsx`

- [ ] **Step 1: Create VerbFab**

```tsx
// frontend/src/components/VerbFab.tsx
import { useState } from 'react'
import type { VerbTemplate } from '../hooks/useVerbTemplates'

interface VerbFabProps {
  templates: VerbTemplate[]
  activeVerb: string | null
  onSelect: (verb: VerbTemplate | null) => void
  onAddNew: () => void
  isOpen: boolean
  onToggle: () => void
}

export function VerbFab({ templates, activeVerb, onSelect, onAddNew, isOpen, onToggle }: VerbFabProps) {
  const [showAddInput, setShowAddInput] = useState(false)
  const [newVerbText, setNewVerbText] = useState('')

  const handleVerbClick = (template: VerbTemplate) => {
    onSelect(template)
  }

  const handleAddSubmit = () => {
    const text = newVerbText.trim()
    if (!text) return
    onAddNew()
    setNewVerbText('')
    setShowAddInput(false)
  }

  const handleBackdropClick = () => {
    if (showAddInput) {
      setShowAddInput(false)
    } else {
      onToggle()
    }
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={onToggle}
          className="w-14 h-14 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center text-2xl hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
        >
          ✏️
        </button>
      </div>
    )
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-30"
        onClick={handleBackdropClick}
      />
      <div className="fixed bottom-6 right-6 z-40 flex flex-col-reverse items-end gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="w-14 h-14 rounded-full bg-gray-800 dark:bg-gray-700 text-white shadow-lg flex items-center justify-center text-2xl transition-transform rotate-45"
        >
          ✏️
        </button>
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => handleVerbClick(template)}
            className={`px-4 py-2 rounded-full text-sm font-medium shadow-md transition-colors flex items-center gap-2 ${
              activeVerb === template.id
                ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border-2 border-indigo-500'
                : 'bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600'
            }`}
          >
            <span>{template.icon}</span>
            <span>{template.text}</span>
          </button>
        ))}
        {showAddInput ? (
          <form
            onSubmit={(e) => { e.preventDefault(); handleAddSubmit() }}
            className="bg-white dark:bg-gray-800 rounded-full shadow-md flex items-center gap-1 px-2"
          >
            <input
              type="text"
              value={newVerbText}
              onChange={(e) => setNewVerbText(e.target.value)}
              placeholder="глагол"
              maxLength={30}
              autoFocus
              className="w-24 px-2 py-2 text-sm bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none"
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddInput(true)}
            className="px-4 py-2 rounded-full text-sm font-medium bg-indigo-600 dark:bg-indigo-500 text-white shadow-md hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
          >
            + свой
          </button>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/VerbFab.tsx
git commit -m "feat: add VerbFab mobile component"
```

---

## Task 10: Frontend — TaskListView integration

**Files:**
- Modify: `frontend/src/components/TaskListView.tsx`

- [ ] **Step 1: Add imports**

At the top of `TaskListView.tsx`, add:

```typescript
import { useState, useEffect } from 'react'
import { VerbChips } from './VerbChips'
import { VerbFab } from './VerbFab'
import { useVerbTemplates, type VerbTemplate } from '../hooks/useVerbTemplates'
```

(Adjust if `useState`/`useEffect` are already imported.)

- [ ] **Step 2: Add props**

Add to the component's props interface:

```typescript
interface TaskListViewProps {
  // ... existing props
  showVerbChips?: boolean
}
```

- [ ] **Step 3: Add verb state and hook inside the component**

Inside the component function, after existing state declarations:

```typescript
  const { templates, ensureDefaults, addVerb } = useVerbTemplates()
  const [activeVerb, setActiveVerb] = useState<VerbTemplate | null>(null)
  const [inputFocused, setInputFocused] = useState(false)
  const [fabOpen, setFabOpen] = useState(false)
  const [mobileInputVisible, setMobileInputVisible] = useState(false)

  useEffect(() => {
    ensureDefaults()
  }, [])
```

- [ ] **Step 4: Modify the form field — inject verb text into title**

In the `handleAddTask` function (or equivalent submit handler), prepend the verb text:

```typescript
  const verbPrefix = activeVerb ? `${activeVerb.text} ` : ''
```

When creating the task, use `title: verbPrefix + data.title` instead of just `data.title`.

After successful submit:
```typescript
  setActiveVerb(null)
  setMobileInputVisible(false)
  setFabOpen(false)
```

- [ ] **Step 5: Add chip/focus handlers**

```typescript
  const handleVerbSelect = (verb: VerbTemplate | null) => {
    setActiveVerb(verb)
    if (verb && window.innerWidth < 768) {
      setMobileInputVisible(true)
      setFabOpen(false)
    }
  }

  const handleFabToggle = () => {
    setFabOpen(prev => !prev)
  }
```

- [ ] **Step 6: Modify the add form rendering**

Wrap the existing form in conditional logic:

For **desktop** (md and up): Add VerbChips above the input, shown only when `inputFocused` is true. Add `onFocus`/`onBlur` handlers to the input.

For **mobile** (below md): Hide the form entirely unless `mobileInputVisible` is true. Show VerbFab instead.

The form JSX structure:

```tsx
{/* Desktop: chips shown on focus */}
<div className="hidden md:block">
  {showAddForm && (
    <form onSubmit={handleSubmit(handleAddTask)} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4">
      {inputFocused && (
        <VerbChips
          templates={templates}
          activeVerb={activeVerb?.id ?? null}
          onSelect={handleVerbSelect}
          onAddNew={() => { /* inline add handled inside VerbChips via addVerb */ }}
        />
      )}
      <div className="flex gap-2">
        <div className="flex-1">
          <input
            {...titleField}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setTimeout(() => setInputFocused(false), 200)}
            placeholder={activeVerb ? `${activeVerb.text} ...` : 'Добавьте задачу...'}
            // ... existing className, disabled, ref
          />
        </div>
        {/* ... existing + and Add buttons */}
      </div>
      {/* ... existing description textarea */}
    </form>
  )}
</div>

{/* Mobile: form hidden unless verb selected */}
{mobileInputVisible && (
  <div className="md:hidden">
    <form onSubmit={handleSubmit(handleAddTask)} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4 border-2 border-indigo-500">
      <div className="flex gap-2">
        <div className="flex-1">
          <input
            {...titleField}
            autoFocus
            placeholder={activeVerb ? `${activeVerb.text} ...` : 'Добавьте задачу...'}
            // ... existing className
          />
        </div>
        <button type="submit" ...>Add</button>
      </div>
    </form>
  </div>
)}

{/* Mobile: FAB */}
<div className="md:hidden">
  <VerbFab
    templates={templates}
    activeVerb={activeVerb?.id ?? null}
    onSelect={handleVerbSelect}
    onAddNew={() => {}}
    isOpen={fabOpen}
    onToggle={handleFabToggle}
  />
</div>
```

Note: The exact JSX placement must match the existing form location. The key change is wrapping with responsive classes and adding verb state management.

- [ ] **Step 7: Verify TypeScript and lint**

Run:
```bash
cd frontend && npx tsc --noEmit && npm run lint
```

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/TaskListView.tsx
git commit -m "feat: integrate VerbChips and VerbFab into TaskListView"
```

---

## Task 11: Frontend — VerbSettings component + Settings tab

**Files:**
- Create: `frontend/src/components/VerbSettings.tsx`
- Modify: `frontend/src/routes/Settings.tsx`

- [ ] **Step 1: Create VerbSettings component**

```tsx
// frontend/src/components/VerbSettings.tsx
import { useState } from 'react'
import { useVerbTemplates } from '../hooks/useVerbTemplates'
import { useToastStore } from '../stores/toastStore'

const RANDOM_ICONS = ['🎯', '📖', '🔧', '💡', '📊', '🗂️', '🚀', '⭐', '📝', '🎪']

export function VerbSettings() {
  const { templates, addVerb, updateVerb, deleteVerb, resetVerbs } = useVerbTemplates()
  const addToast = useToastStore(s => s.addToast)
  const [newText, setNewText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editIcon, setEditIcon] = useState('')

  const handleAdd = async () => {
    const text = newText.trim()
    if (!text) return
    const icon = RANDOM_ICONS[Math.floor(Math.random() * RANDOM_ICONS.length)]
    await addVerb(text, icon)
    setNewText('')
  }

  const handleStartEdit = (id: string, text: string, icon: string) => {
    setEditingId(id)
    setEditText(text)
    setEditIcon(icon)
  }

  const handleSaveEdit = async () => {
    if (!editingId) return
    const data: { text?: string; icon?: string } = {}
    if (editText.trim()) data.text = editText.trim()
    if (editIcon.trim()) data.icon = editIcon.trim()
    await updateVerb(editingId, data)
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    await deleteVerb(id)
  }

  const handleReset = async () => {
    await resetVerbs()
    addToast({ title: 'Готово', body: 'Глаголы сброшены по умолчанию', type: 'success' })
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Быстрые глаголы
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Глаголы для быстрого добавления задач. На десктопе — чипы над полем ввода, на мобильном — кнопка ✏️.
      </p>

      <div className="space-y-2 mb-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
          >
            {editingId === template.id ? (
              <>
                <input
                  type="text"
                  value={editIcon}
                  onChange={(e) => setEditIcon(e.target.value)}
                  maxLength={10}
                  className="w-12 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  maxLength={30}
                  className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                />
                <button
                  onClick={handleSaveEdit}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Сохранить
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-sm text-gray-500 hover:underline"
                >
                  Отмена
                </button>
              </>
            ) : (
              <>
                <span className="text-lg">{template.icon}</span>
                <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">{template.text}</span>
                <button
                  onClick={() => handleStartEdit(template.id, template.text, template.icon)}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Изменить
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="text-sm text-red-600 dark:text-red-400 hover:underline"
                >
                  Удалить
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Новый глагол..."
          maxLength={30}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        <button
          onClick={handleAdd}
          disabled={!newText.trim()}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Добавить
        </button>
      </div>

      <button
        onClick={handleReset}
        className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:underline"
      >
        Сбросить по умолчанию
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Add "Глаголы" tab to Settings.tsx**

In `frontend/src/routes/Settings.tsx`:

Update Tab type:
```typescript
type Tab = 'general' | 'profile' | 'security' | 'verbs' | 'users'
```

Update tabs array:
```typescript
const tabs: { key: Tab; label: string; adminOnly: boolean }[] = [
  { key: 'general', label: 'Общие', adminOnly: false },
  { key: 'profile', label: 'Профиль', adminOnly: false },
  { key: 'security', label: 'Безопасность', adminOnly: false },
  { key: 'verbs', label: 'Глаголы', adminOnly: false },
  { key: 'users', label: 'Пользователи', adminOnly: true },
]
```

Add import at top:
```typescript
import { VerbSettings } from '../components/VerbSettings'
```

Add tab content after the security tab content and before the users tab content:
```tsx
{activeTab === 'verbs' && (
  <VerbSettings />
)}
```

- [ ] **Step 3: Verify TypeScript and lint**

Run:
```bash
cd frontend && npx tsc --noEmit && npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/VerbSettings.tsx frontend/src/routes/Settings.tsx
git commit -m "feat: add VerbSettings and 'Глаголы' tab in Settings"
```

---

## Task 12: Final verification

- [ ] **Step 1: Run backend lint**

```bash
cd backend && ruff check app/ --fix
```

- [ ] **Step 2: Run frontend typecheck**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Run frontend lint**

```bash
cd frontend && npm run lint
```

- [ ] **Step 4: Run backend to verify startup**

```bash
cd backend && python -c "from app.main import app; print('Backend OK')"
```

- [ ] **Step 5: Update docs/features.md**

Add to the appropriate section:

```markdown
### Быстрые глаголы
- Предустановленные глаголы (Купить, Сделать, Проверить, Позвонить, Написать, Найти) для быстрого добавления задач
- Desktop: чипы-глаголы над полем ввода (появляются при фокусе)
- Mobile: FAB-кнопка с веером глаголов (поле ввода скрыто до выбора глагола)
- Настраиваемый список глаголов в Настройках → Глаголы
- Синхронизация между устройствами через сервер
- Offline-first: глаголы работают без сети
```

- [ ] **Step 6: Final commit**

```bash
git add docs/features.md
git commit -m "docs: update features.md with verb quick-add"
```
