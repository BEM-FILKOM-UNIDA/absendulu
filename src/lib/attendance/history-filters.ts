export type AttendanceStatus = 'hadir' | 'terlambat' | 'izin' | 'alpha'
export type HistoryStatusFilter = 'all' | AttendanceStatus

export type HistoryFilters = {
  query: string
  status: HistoryStatusFilter
}

type HistoryEvent = {
  name?: string | null
}

type HistoryProfile = {
  full_name?: string | null
  nim?: string | null
}

export type HistoryFilterItem = {
  status: AttendanceStatus
  check_in_at: string
  events?: HistoryEvent | HistoryEvent[] | null
  profiles?: HistoryProfile | HistoryProfile[] | null
}

export const defaultHistoryFilters: HistoryFilters = {
  query: '',
  status: 'all',
}

function getEventName(item: HistoryFilterItem) {
  const event = Array.isArray(item.events) ? item.events[0] : item.events
  return event?.name || ''
}

function getProfile(item: HistoryFilterItem) {
  const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
  return profile || null
}

// ponytail: hanya admin yang memanggil — mahasiswa lihat daftar mentah tanpa filter
export function filterHistory<T extends HistoryFilterItem>(items: T[], filters: HistoryFilters): T[] {
  const query = filters.query.trim().toLocaleLowerCase('id-ID')

  return items.filter((item) => {
    if (filters.status !== 'all' && item.status !== filters.status) return false
    if (!query) return true

    const profile = getProfile(item)
    const searchableValues = [getEventName(item), profile?.full_name || '', profile?.nim || '']

    return searchableValues.some((value) => value.toLocaleLowerCase('id-ID').includes(query))
  })
}
