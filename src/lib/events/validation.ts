const DATE_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/
const TIME_PATTERN = /^[0-9]{2}:[0-9]{2}$/
const EVENT_STATUSES = new Set(['draft', 'active', 'completed', 'cancelled'])

export type EventStatus = 'draft' | 'active' | 'completed' | 'cancelled'
export type EventInput = {
  name: string
  description: string | null
  event_date: string
  start_time: string
  end_time: string | null
  location: string | null
  status: EventStatus
}

function isValidDate(value: string) {
  if (!DATE_PATTERN.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function isValidTime(value: string) {
  if (!TIME_PATTERN.test(value)) return false
  const [hour, minute] = value.split(':').map(Number)
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59
}

function toMinutes(time: string) {
  const [hour, minute] = time.slice(0, 5).split(':').map(Number)
  return hour * 60 + minute
}

export function isValidEventTimeRange(startTime: string, endTime: string | null) {
  return endTime === null || toMinutes(startTime) !== toMinutes(endTime)
}

export function parseEventInput(value: unknown): EventInput | null {
  if (!value || typeof value !== 'object') return null
  const body = value as Record<string, unknown>
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const description = typeof body.description === 'string' && body.description.trim() ? body.description.trim() : null
  const event_date = typeof body.event_date === 'string' ? body.event_date : ''
  const start_time = typeof body.start_time === 'string' ? body.start_time : ''
  const end_time = typeof body.end_time === 'string' && body.end_time ? body.end_time : null
  const location = typeof body.location === 'string' && body.location.trim() ? body.location.trim() : null
  const status = typeof body.status === 'string' && EVENT_STATUSES.has(body.status) ? body.status as EventStatus : 'active'
  if (!name || name.length > 160 || (description && description.length > 5000) || (location && location.length > 200)) return null
  if (!isValidDate(event_date) || !isValidTime(start_time) || (end_time && !isValidTime(end_time))) return null
  if (!isValidEventTimeRange(start_time, end_time)) return null
  // Reject events with dates in the past (allow same-day events)
  const today = new Date().toISOString().slice(0, 10)
  if (event_date < today) return null
  return { name, description, event_date, start_time, end_time, location, status }
}
