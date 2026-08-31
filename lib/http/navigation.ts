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

export function extractQrToken(value: string | null | undefined) {
  const normalizedValue = value?.trim() ?? ''
  if (!normalizedValue) return null

  try {
    const parsed = new URL(normalizedValue, 'https://absendulu.invalid')
    if (parsed.pathname === '/scan' && parsed.searchParams.has('token')) {
      const token = parsed.searchParams.get('token')?.trim() ?? ''
      return token.length >= 16 && token.length <= 128 ? token : null
    }
  } catch {
    return null
  }

  return normalizedValue.length >= 16 && normalizedValue.length <= 128
    ? normalizedValue
    : null
}
