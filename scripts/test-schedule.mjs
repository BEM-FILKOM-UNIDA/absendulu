import { strict as assert } from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ts from 'typescript'

const directory = path.dirname(fileURLToPath(import.meta.url))
const sourcePath = path.join(directory, '..', 'lib', 'events', 'schedule.ts')
const source = fs.readFileSync(sourcePath, 'utf8')
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2019,
  },
}).outputText
const scheduleModule = { exports: {} }
new Function('module', 'exports', output)(scheduleModule, scheduleModule.exports)
const { getSchedulePosition, isValidEventTimeRange } = scheduleModule.exports

assert.equal(isValidEventTimeRange('23:48', '00:36'), true)
assert.equal(isValidEventTimeRange('09:00', '10:00'), true)
assert.equal(isValidEventTimeRange('09:00', null), true)
assert.equal(isValidEventTimeRange('09:00', '09:00'), false)

function assertOvernightSchedule() {
  const beforeStart = getSchedulePosition('2026-08-30', '23:48', '00:36', '2026-08-30', '23:47')
  const duringEvent = getSchedulePosition('2026-08-30', '23:48', '00:36', '2026-08-31', '00:10')
  const atEnd = getSchedulePosition('2026-08-30', '23:48', '00:36', '2026-08-31', '00:36')
  const afterEnd = getSchedulePosition('2026-08-30', '23:48', '00:36', '2026-08-31', '00:37')

  assert.ok(beforeStart)
  assert.ok(duringEvent)
  assert.ok(atEnd)
  assert.ok(afterEnd)
  assert.ok(beforeStart.nowMinutes < beforeStart.startMinutes)
  assert.ok(duringEvent.nowMinutes >= duringEvent.startMinutes)
  assert.ok(duringEvent.nowMinutes <= duringEvent.endMinutes)
  assert.equal(atEnd.nowMinutes, atEnd.endMinutes)
  assert.ok(afterEnd.nowMinutes > afterEnd.endMinutes)
}

function assertSameDaySchedule() {
  const beforeStart = getSchedulePosition('2026-08-30', '09:00', '10:00', '2026-08-30', '08:59')
  const atEnd = getSchedulePosition('2026-08-30', '09:00', '10:00', '2026-08-30', '10:00')
  const afterEnd = getSchedulePosition('2026-08-30', '09:00', '10:00', '2026-08-30', '10:01')

  assert.ok(beforeStart)
  assert.ok(atEnd)
  assert.ok(afterEnd)
  assert.ok(beforeStart.nowMinutes < beforeStart.startMinutes)
  assert.equal(atEnd.nowMinutes, atEnd.endMinutes)
  assert.ok(afterEnd.nowMinutes > afterEnd.endMinutes)
}

assertOvernightSchedule()
assertSameDaySchedule()
console.log('schedule regression: PASS (range validation, overnight, and same-day boundaries)')
