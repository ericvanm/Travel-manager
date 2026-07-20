const { test, describe } = require('node:test')
const assert = require('node:assert')
const {
  parseCSVLine,
  parseCSVDate,
  rowToObject,
  buildNonHotelActivity,
  updateHotelGroup,
  hotelGroupsToActivities,
  groupActivitiesIntoStages,
  activityToRecord
} = require('../utils/csv-import-helpers')

describe('csv-import-helpers', () => {
  test('parseCSVLine handles quoted commas', () => {
    assert.deepStrictEqual(parseCSVLine('"Hello, world",test'), ['Hello, world', 'test'])
  })

  test('parseCSVDate parses ISO and slash formats', () => {
    assert.ok(parseCSVDate('2025-11-07T05:15:00.000Z') instanceof Date)
    assert.ok(parseCSVDate('07/11/2025') instanceof Date)
    assert.strictEqual(parseCSVDate(''), null)
  })

  test('parseCSVDate adjusts Johannesburg timezone', () => {
    const utcDate = parseCSVDate('2025-11-07', 'UTC')
    const saDate = parseCSVDate('2025-11-07', 'Africa/Johannesburg')
    assert.notStrictEqual(utcDate.getTime(), saDate.getTime())
  })

  test('rowToObject maps headers to values', () => {
    const row = rowToObject(['A', 'B'], ['1', '2'])
    assert.deepStrictEqual(row, { A: '1', B: '2' })
  })

  test('updateHotelGroup merges hotel check-in and check-out', () => {
    const hotelGroups = new Map()
    updateHotelGroup(hotelGroups, {
      'Activity Name': 'Hotel ABC',
      'Check-in Date': '07/11/2025',
      'Stage Name': 'Cape Town'
    }, 'UTC')
    updateHotelGroup(hotelGroups, {
      'Activity Name': 'Hotel ABC',
      'Check-out Date': '09/11/2025',
      'Stage Name': 'Cape Town'
    }, 'UTC')

    const activities = hotelGroupsToActivities(hotelGroups)
    assert.strictEqual(activities.length, 1)
    assert.strictEqual(activities[0].name, 'Hotel ABC')
    assert.ok(activities[0].checkOutDate)
  })

  test('buildNonHotelActivity maps activity fields', () => {
    const activityType = { id: 6 }
    const activity = buildNonHotelActivity({
      'Activity Name': 'AMS to JNB',
      'Activity Start DateTime': '2025-11-07T09:10:00.000Z',
      'Activity End DateTime': '2025-11-07T20:05:00.000Z',
      'Stage Name': 'Amsterdam',
      'Activity City': 'Amsterdam',
      'Activity Cost': '120.5'
    }, activityType, 'UTC')

    assert.strictEqual(activity.name, 'AMS to JNB')
    assert.strictEqual(activity.activityTypeId, 6)
    assert.strictEqual(activity.cost, 120.5)
  })

  test('groupActivitiesIntoStages groups by stage name', () => {
    const stages = groupActivitiesIntoStages([
      { stageName: 'Paris', name: 'A', startDateTime: new Date('2025-06-01') },
      { stageName: 'Paris', name: 'B', startDateTime: new Date('2025-06-02'), endDateTime: new Date('2025-06-03') },
      { stageName: 'Lyon', name: 'C', startDateTime: new Date('2025-06-04') }
    ])
    assert.strictEqual(stages.length, 2)
    assert.strictEqual(stages[0].activities.length, 2)
  })

  test('activityToRecord maps stage id', () => {
    const record = activityToRecord({ name: 'Visit', activityTypeId: 1 }, 9)
    assert.strictEqual(record.stageId, 9)
    assert.strictEqual(record.name, 'Visit')
  })
})
