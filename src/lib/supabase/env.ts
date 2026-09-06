// ponytail: single Supabase env seam — fallback for Vercel legacy keys, one place to change
export function getSupabaseUrl(): string {
  const url = import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL belum dikonfigurasi')
  return url
}

export function getPublishableKey(): string {
  const key =
    (import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
    (import.meta.env as Record<string, string | undefined>).NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) throw new Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY belum dikonfigurasi')
  return key
}

export function getServerUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('Supabase server environment belum dikonfigurasi')
  return url
}

export function getServerPublishableKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) throw new Error('Supabase server environment belum dikonfigurasi')
  return key
}

export function getSecretKey(): string {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('Supabase server environment belum dikonfigurasi')
  return key
}
