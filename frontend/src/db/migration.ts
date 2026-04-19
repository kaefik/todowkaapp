export async function migrateOldData(): Promise<void> {
  const oldDatabases = [
    'todowka-query-cache',
    'todowka-cache',
    'todowka-local-changes',
    'todowka-offline',
  ]

  for (const name of oldDatabases) {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(name)
      req.onsuccess = () => resolve()
      req.onerror = () => resolve()
      req.onblocked = () => resolve()
    })
  }
}
