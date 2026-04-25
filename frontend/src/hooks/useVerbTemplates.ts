import { useAuthStore } from '../stores/authStore'
import { db, activeTable } from '../db/database'
import { useDexieQuery } from '../db/hooks'
import { v4 as uuidv4 } from 'uuid'
import { verbTemplatesApi } from '../api/verbTemplates'
import { getInitialSyncPromise, isInitialSyncDone } from '../db/syncEngine'

export interface VerbTemplate {
  id: string
  text: string
  icon: string
  position: number
}

const DEFAULT_VERBS: { text: string; icon: string; position: number }[] = [
  { text: 'Купить', icon: '🛒', position: 0 },
  { text: 'Сделать', icon: '🔨', position: 1 },
  { text: 'Проверить', icon: '✅', position: 2 },
  { text: 'Позвонить', icon: '📞', position: 3 },
  { text: 'Написать', icon: '✉️', position: 4 },
  { text: 'Найти', icon: '🔍', position: 5 },
]

let ensureDefaultsPromise: Promise<void> | null = null

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

    if (ensureDefaultsPromise) {
      await ensureDefaultsPromise
      return
    }

    ensureDefaultsPromise = (async () => {
      try {
        const syncPromise = getInitialSyncPromise()
        if (syncPromise) {
          await syncPromise
        } else if (!isInitialSyncDone()) {
          return
        }

        const existing = await activeTable(db.verbTemplates, user.id).count()
        if (existing > 0) return

        const serverSynced = await db.verbTemplates
          .where('userId')
          .equals(user.id)
          .filter(r => r._syncStatus === 'synced')
          .count()
        if (serverSynced > 0) return

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
            payload: JSON.stringify({ id, text: def.text, icon: def.icon }),
            timestamp: Date.now(),
            retryCount: 0,
            lastError: null,
          })
        }
      } finally {
        ensureDefaultsPromise = null
      }
    })()

    await ensureDefaultsPromise
  }

  const addVerb = async (text: string, icon: string): Promise<{ duplicate: boolean }> => {
    if (!user) return { duplicate: false }

    const normalizedName = text.trim().toLowerCase()
    const all = await activeTable(db.verbTemplates, user.id).toArray()
    const duplicate = all.some(v => v.text.toLowerCase() === normalizedName)
    if (duplicate) return { duplicate: true }

    const id = uuidv4()
    const now = new Date().toISOString()
    const maxPos = all.length > 0 ? Math.max(...all.map(v => v.position)) + 1 : 0

    await db.verbTemplates.add({
      id,
      userId: user.id,
      text: text.trim(),
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
      payload: JSON.stringify({ id, text: text.trim(), icon }),
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })
    return { duplicate: false }
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
