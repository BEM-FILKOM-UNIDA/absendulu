// ponytail: one-line memo with TTL — no dep, no abstraction for later
type CacheEntry<T> = { data: T; expires: number }
const store = new Map<string, CacheEntry<unknown>>()
// Inflight map: concurrent callers with the same key share one in-flight Promise
// instead of each firing a separate DB query. The entry is removed once the
// Promise settles so a subsequent call after settlement re-evaluates normally.
const inflight = new Map<string, Promise<unknown>>()

export function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key) as CacheEntry<T> | undefined
  if (hit && Date.now() < hit.expires) return Promise.resolve(hit.data)

  const existing = inflight.get(key) as Promise<T> | undefined
  if (existing) return existing

  const promise = fn().then((data) => {
    store.set(key, { data, expires: Date.now() + ttlMs })
    inflight.delete(key)
    return data
  }, (error: unknown) => {
    inflight.delete(key)
    throw error
  })
  inflight.set(key, promise)
  return promise
}

export function invalidate(prefix: string) {
  for (const key of store.keys()) if (key.startsWith(prefix)) store.delete(key)
}

// for per-request cache (Vercel serverless) — 5s for dashboard so new data appears without manual refresh, still 12x fewer DB hits for 70+ burst
export const TTL = {
  dashboard: 5_000,
  events: 5_000,
  members: 30_000,
}
