const { test, before, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const { connectToDatabase } = require('../utils/db')
const {
  validateTripAccommodationCoverage,
  validateAdaptationAccommodation,
  simulateSnapshotAfterChanges,
  findUncoveredNights,
  fillAccommodationGaps
} = require('../utils/trip-accommodation-validation')
const {
  resetDatabase,
  createTripForUser,
  createAuthenticatedAgent,
  createStage
} = require('./setup')

let app

before(async () => {
  await connectToDatabase()
  app = require('../app')
})

beforeEach(async () => {
  await resetDatabase()
})

const baseSnapshot = () => ({
  trip: { startDate: '2027-06-01', endDate: '2027-06-04' },
  stages: [{
    id: 1,
    name: 'Paris',
    startDate: '2027-06-01',
    endDate: '2027-06-04',
    activities: []
  }]
})

describe('trip-accommodation-validation', () => {
  test('findUncoveredNights detects missing hotel nights', () => {
    const snapshot = baseSnapshot()
    const nights = findUncoveredNights(
      snapshot.trip,
      snapshot.stages,
      [],
      snapshot.stages[0].activities
    )
    assert.ok(nights.length > 0)
    assert.ok(nights.includes('2027-06-01'))
  })

  test('validateTripAccommodationCoverage passes when nights are covered', () => {
    const snapshot = baseSnapshot()
    snapshot.stages[0].activities = [{
      id: 1,
      activityTypeId: 7,
      name: 'Hotel',
      checkInDate: '2027-06-01',
      checkOutDate: '2027-06-04'
    }]

    const report = validateTripAccommodationCoverage(snapshot)
    assert.strictEqual(report.covered, true)
    assert.strictEqual(report.uncoveredNights.length, 0)
  })

  test('simulateSnapshotAfterChanges applies activity create and update', () => {
    const snapshot = baseSnapshot()
    snapshot.stages[0].activities = [{
      id: 10,
      activityTypeId: 3,
      name: 'Old tour',
      city: 'Paris'
    }]

    const simulated = simulateSnapshotAfterChanges(snapshot, {
      changes: [
        {
          action: 'update',
          entityType: 'activity',
          entityId: 10,
          location: 'Lyon',
          description: 'Updated tour'
        },
        {
          action: 'create',
          entityType: 'activity',
          stageId: 1,
          activityType: 'hotel',
          location: 'Paris',
          checkInDate: '2027-06-01',
          checkOutDate: '2027-06-04',
          name: 'New hotel'
        }
      ]
    })

    const updated = simulated.stages[0].activities.find((a) => a.id === 10)
    assert.strictEqual(updated.city, 'Lyon')
    assert.ok(simulated.stages[0].activities.some((a) => a.activityTypeId === 7))
  })

  test('validateAdaptationAccommodation evaluates proposed changes', () => {
    const snapshot = baseSnapshot()
    const report = validateAdaptationAccommodation(snapshot, {
      changes: [{
        action: 'create',
        entityType: 'activity',
        stageId: 1,
        activityType: 'hotel',
        location: 'Paris',
        checkInDate: '2027-06-01',
        checkOutDate: '2027-06-04',
        name: 'Hotel'
      }]
    })
    assert.strictEqual(report.covered, true)
  })

  test('fillAccommodationGaps creates hotels for uncovered nights', async () => {
    const { user } = await createAuthenticatedAgent(app, { username: 'accouser' })
    const trip = await createTripForUser(user.id)
    const stage = await createStage(trip.id, {
      name: 'Nice',
      startDate: '2027-09-01',
      endDate: '2027-09-03'
    })

    const snapshot = {
      trip: { id: trip.id, startDate: '2027-09-01', endDate: '2027-09-03' },
      stages: [{
        id: stage.id,
        name: 'Nice',
        startDate: '2027-09-01',
        endDate: '2027-09-03',
        activities: []
      }]
    }

    const result = await fillAccommodationGaps(trip.id, snapshot)
    assert.ok(result.created > 0)
    assert.ok(result.nights.length > 0)
  })
})
