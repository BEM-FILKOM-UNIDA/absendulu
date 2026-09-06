// ponytail: one-line memo with TTL — no dep, no abstraction for later
type CacheEntry<T> = { data: T; expires: number }
const store = new Map<string, CacheEntry<unknown>>()

export function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key) as CacheEntry<T> | undefined
  if (hit && Date.now() < hit.expires) return Promise.resolve(hit.data)
  return fn().then((data) => {
    store.set(key, { data, expires: Date.now() + ttlMs })
    return data
  })
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
