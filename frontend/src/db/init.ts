import { db } from './database'
import { initialSync } from './syncEngine'

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function performInitialSync(userId: string): Promise<void> {
  const maxRetries = 3

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await initialSync(userId)
      return
    } catch (err) {
      if (err instanceof TypeError || (err instanceof Error && err.message.includes('Network'))) {
        if (attempt < maxRetries - 1) {
          const delay = 1000 * Math.pow(2, attempt)
          console.warn(`[InitSync] Network error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
          await sleep(delay)
          continue
        }
      }
      console.error('[InitSync] Initial sync failed:', err)
      throw err
    }
  }
}

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
