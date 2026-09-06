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

// for per-request cache (Vercel serverless) — 30s is enough for 70+ concurrent dashboard hits
export const TTL = {
  dashboard: 30_000,
  events: 20_000,
  members: 60_000,
}
