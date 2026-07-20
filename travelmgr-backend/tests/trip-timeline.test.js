const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { buildTripTimeline } = require('../utils/trip-timeline')
const { wallClockDateInTimezone, wallClockTimeInTimezone } = require('../utils/datetime-timezone')

describe('trip-timeline timezone', () => {
  it('uses stage timezone for wall-clock dates', () => {
    const iso = '2027-05-03T19:00:00.000Z'
    assert.equal(wallClockDateInTimezone(iso, 'Asia/Bangkok'), '2027-05-04')
    assert.equal(wallClockTimeInTimezone(iso, 'Asia/Bangkok'), '02:00')
  })

  it('places activity on local calendar day in timeline', () => {
    const stages = [{
      id: 1,
      name: 'Bangkok',
      startDate: '2027-05-01',
      endDate: '2027-05-10',
      Country: { timezone: 'Asia/Bangkok' }
    }]
    const activities = [{
      id: 100,
      stageId: 1,
      activityTypeId: 3,
      name: 'Early tour',
      startDateTime: '2027-05-03T19:00:00.000Z',
      endDateTime: '2027-05-03T22:00:00.000Z'
    }]

    const timeline = buildTripTimeline(stages, activities)
    const day = timeline.find((d) => d.date === '2027-05-04')
    assert.ok(day)
    assert.ok(day.activities.some((a) => a.id === 100))
  })

  it('groups transport and accommodation items on timeline days', () => {
    const stages = [{
      id: 2,
      name: 'Paris',
      startDate: '2027-06-01',
      endDate: '2027-06-03',
      Country: { timezone: 'Europe/Paris' }
    }]
    const activities = [
      {
        id: 201,
        stageId: 2,
        activityTypeId: 6,
        name: 'Flight in',
        startDateTime: '2027-06-01T08:00:00.000Z',
        endDateTime: '2027-06-01T12:00:00.000Z'
      },
      {
        id: 202,
        stageId: 2,
        activityTypeId: 7,
        name: 'Hotel Paris',
        checkInDate: '2027-06-01',
        checkOutDate: '2027-06-03',
        startDateTime: '2027-06-01T15:00:00.000Z',
        endDateTime: '2027-06-03T11:00:00.000Z'
      }
    ]

    const timeline = buildTripTimeline(stages, activities)
    assert.ok(timeline.length > 0)
    const allItems = timeline.flatMap((day) => day.activities)
    assert.ok(allItems.some((item) => item.id === 201))
    assert.ok(allItems.some((item) => item.id === 202))
  })
})
