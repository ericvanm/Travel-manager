const { test, describe } = require('node:test')
const assert = require('node:assert')
const {
  parseICS,
  extractTripInfo,
  groupEventsByStage,
  convertToActivity,
  resolveStageName,
  groupActivitiesIntoStages
} = require('../utils/ics-import-helpers')

const SAMPLE_ICS = `BEGIN:VCALENDAR
X-WR-CALDESC:Summer trip
BEGIN:VEVENT
SUMMARY:Paris Vacation
DTSTART:20250601
DTEND:20250610
LOCATION:Paris\\, France
END:VEVENT
BEGIN:VEVENT
SUMMARY:Check-in: Hotel Le Marais
DTSTART:20250602
DTEND:20250602
LOCATION:12 Rue Example\\, Paris
DESCRIPTION:Hotel stay
END:VEVENT
BEGIN:VEVENT
SUMMARY:Louvre visit
DTSTART:20250603T100000Z
DTEND:20250603T120000Z
LOCATION:Paris
END:VEVENT
END:VCALENDAR`

describe('ics-import-helpers', () => {
  test('parseICS extracts VEVENT blocks', () => {
    const events = parseICS(SAMPLE_ICS)
    assert.strictEqual(events.length, 3)
    assert.strictEqual(events[0].SUMMARY, 'Paris Vacation')
  })

  test('extractTripInfo reads main trip dates', () => {
    const events = parseICS(SAMPLE_ICS)
    const trip = extractTripInfo(events, SAMPLE_ICS)
    assert.ok(trip)
    assert.strictEqual(trip.name, 'Paris Vacation')
    assert.strictEqual(trip.description, 'Summer trip')
    assert.ok(trip.startDate instanceof Date)
    assert.ok(trip.endDate instanceof Date)
  })

  test('groupEventsByStage groups by city', () => {
    const events = parseICS(SAMPLE_ICS)
    const stages = groupEventsByStage(events)
    assert.ok(stages.some((stage) => stage.name === 'Paris'))
  })

  test('convertToActivity detects lodging and default activities', () => {
    const events = parseICS(SAMPLE_ICS)
    const lodging = convertToActivity(events[1])
    assert.strictEqual(lodging.type, 'lodging')
    assert.strictEqual(lodging.activityTypeId, 7)

    const visit = convertToActivity(events[2])
    assert.strictEqual(visit.type, 'activity')
    assert.strictEqual(visit.activityTypeId, 1)
  })

  test('resolveStageName prefers hotel name for hotel-only stages', () => {
    const stageName = resolveStageName({
      name: 'Paris',
      activities: [{ SUMMARY: 'Check-in: Hotel Le Marais' }]
    })
    assert.strictEqual(stageName, 'Hotel Le Marais')
  })

  test('groupActivitiesIntoStages merges consecutive same-stage activities', () => {
    const stages = groupActivitiesIntoStages([
      { stageName: 'Paris', name: 'A', activityTypeId: 1 },
      { stageName: 'Paris', name: 'B', activityTypeId: 1 },
      { stageName: 'Lyon', name: 'C', activityTypeId: 1 }
    ])
    assert.strictEqual(stages.length, 2)
    assert.strictEqual(stages[0].activities.length, 2)
    assert.strictEqual(stages[1].activities.length, 1)
  })
})
