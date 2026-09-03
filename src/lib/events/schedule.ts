import { toMinutes } from './time-utils'

export { isValidEventTimeRange } from './time-utils'

const MINUTES_PER_DAY = 24 * 60

type SchedulePosition = {
  nowMinutes: number
  startMinutes: number
  endMinutes: number | null
}

function dateDifference(startDate: string, currentDate: string): number | null {
  const start = new Date(`${startDate}T00:00:00Z`)
  const current = new Date(`${currentDate}T00:00:00Z`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(current.getTime())) return null
  return Math.round((current.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
}

export function getSchedulePosition(
  eventDate: string,
  startTime: string,
  endTime: string | null,
  currentDate: string,
  currentTime: string,
): SchedulePosition | null {
  const daysFromEvent = dateDifference(eventDate, currentDate)
  if (daysFromEvent === null) return null

  const startMinutes = toMinutes(startTime)
  const currentMinutes = daysFromEvent * MINUTES_PER_DAY + toMinutes(currentTime)
  if (!endTime) return { nowMinutes: currentMinutes, startMinutes, endMinutes: null }

  const endOnEventDay = toMinutes(endTime)
  const endMinutes = endOnEventDay <= startMinutes ? endOnEventDay + MINUTES_PER_DAY : endOnEventDay
  return { nowMinutes: currentMinutes, startMinutes, endMinutes }
}
