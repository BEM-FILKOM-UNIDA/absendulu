// ponytail: 3-file events split kept for test isolation (test-schedule.mjs imports time-utils directly); merge to lib/events.ts when tests move to vitest
export function toMinutes(time: string): number {
  const [hour, minute] = time.slice(0, 5).split(':').map(Number)
  return hour * 60 + minute
}

export function isValidEventTimeRange(startTime: string, endTime: string | null): boolean {
  return endTime === null || toMinutes(startTime) !== toMinutes(endTime)
}
