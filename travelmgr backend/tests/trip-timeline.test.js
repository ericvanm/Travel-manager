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
})
