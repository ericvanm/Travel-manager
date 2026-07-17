const { test, before, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const { connectToDatabase } = require('../utils/db')
const { ACTIVITY_TYPE } = require('../utils/activity-types')
const {
  getLatestTransportEndBefore,
  enforceStageActivityTiming,
  enforceTripActivityTransportTiming
} = require('../utils/trip-activity-timing')
const {
  resetDatabase,
  createTripForUser,
  createAuthenticatedAgent,
  createStage,
  createActivity
} = require('./setup')

let app

before(async () => {
  await connectToDatabase()
  app = require('../app')
})

beforeEach(async () => {
  await resetDatabase()
})

describe('trip-activity-timing', () => {
  test('getLatestTransportEndBefore finds latest transport ending before activity', () => {
    const activities = [
      { id: 1, activityTypeId: ACTIVITY_TYPE.FLIGHT, endDateTime: '2027-06-01T10:00:00.000Z' },
      { id: 2, activityTypeId: ACTIVITY_TYPE.FLIGHT, endDateTime: '2027-06-01T14:00:00.000Z' },
      { id: 3, activityTypeId: ACTIVITY_TYPE.TOUR, startDateTime: '2027-06-01T16:00:00.000Z' }
    ]

    const latest = getLatestTransportEndBefore(activities, activities[2])
    assert.strictEqual(latest, '2027-06-01T14:00:00.000Z')
  })

  test('enforceStageActivityTiming returns empty when activities already follow transport', () => {
    const activities = [
      {
        id: 1,
        activityTypeId: ACTIVITY_TYPE.FLIGHT,
        endDateTime: '2027-06-01T10:00:00.000Z'
      },
      {
        id: 2,
        activityTypeId: ACTIVITY_TYPE.TOUR,
        startDateTime: '2027-06-01T12:00:00.000Z',
        endDateTime: '2027-06-01T14:00:00.000Z'
      }
    ]

    const changed = enforceStageActivityTiming(activities)
    assert.strictEqual(changed.length, 0)
  })

  test('enforceTripActivityTransportTiming completes without changes when timing is valid', async () => {
    const { user } = await createAuthenticatedAgent(app, { username: 'timinguser' })
    const trip = await createTripForUser(user.id)
    const stage = await createStage(trip.id)
    await createActivity(stage.id, {
      name: 'Flight',
      activityTypeId: ACTIVITY_TYPE.FLIGHT,
      startDateTime: '2027-06-01T08:00:00.000Z',
      endDateTime: '2027-06-01T14:00:00.000Z'
    })
    await createActivity(stage.id, {
      name: 'Tour',
      activityTypeId: ACTIVITY_TYPE.TOUR,
      startDateTime: '2027-06-01T16:00:00.000Z',
      endDateTime: '2027-06-01T18:00:00.000Z'
    })

    const adjusted = await enforceTripActivityTransportTiming(trip.id)
    assert.strictEqual(adjusted, 0)
  })
})
