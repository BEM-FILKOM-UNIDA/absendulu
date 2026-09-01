export function getSafeNextPath(value: string | null | undefined, fallback = '/mahasiswa') {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('\\')) return fallback

  try {
    const parsed = new URL(value, 'https://absendulu.invalid')
    if (parsed.origin !== 'https://absendulu.invalid' || parsed.pathname.startsWith('//')) return fallback
  } catch {
    return fallback
  }

  return value
}
