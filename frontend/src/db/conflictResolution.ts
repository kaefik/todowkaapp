import { db, type SyncStatus } from './database'

interface Mergeable {
  updatedAt: string
  _syncStatus: SyncStatus
  _lastSyncedAt: string | null
}

export async function shouldSkipMerge(
  entityType: string,
  entityId: string
): Promise<boolean> {
  const pending = await db.mutations
    .where('[entityType+entityId]')
    .equals([entityType, entityId])
    .count()
  return pending > 0
}

export function mergeRecord<T extends Mergeable>(
  localRecord: T | undefined,
  serverRecord: T
): T {
  if (!localRecord) return serverRecord
  if (localRecord._syncStatus === 'synced') {
    console.debug('[mergeRecord] server wins (local synced)', {
      id: (localRecord as unknown as { id?: string }).id,
      serverUpdatedAt: serverRecord.updatedAt,
    })
    return serverRecord
  }

  const localTime = new Date(localRecord.updatedAt).getTime()
  const serverTime = new Date(serverRecord.updatedAt).getTime()

  if (serverTime > localTime) {
    console.debug('[mergeRecord] server wins (newer)', {
      id: (localRecord as unknown as { id?: string }).id,
      localUpdatedAt: localRecord.updatedAt,
      serverUpdatedAt: serverRecord.updatedAt,
    })
    return serverRecord
  }
  return localRecord
}
