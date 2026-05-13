const pushEchoEntities = new Map<string, number>()
const PUSH_ECHO_WINDOW_MS = 5000

export function markPushEcho(entityType: string, entityId: string) {
  pushEchoEntities.set(`${entityType}:${entityId}`, Date.now())
}

export function isPushEcho(entityType: string, entityId?: string): boolean {
  const now = Date.now()
  for (const [key, ts] of pushEchoEntities) {
    if (now - ts > PUSH_ECHO_WINDOW_MS) {
      pushEchoEntities.delete(key)
    }
  }
  if (entityId) {
    return pushEchoEntities.has(`${entityType}:${entityId}`)
  }
  for (const key of pushEchoEntities.keys()) {
    if (key.startsWith(`${entityType}:`)) return true
  }
  return false
}
