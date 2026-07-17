const { test, before, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const { connectToDatabase } = require('../utils/db')
const { buildTripSynthesis, loadTripSnapshot } = require('../utils/trip-snapshot')
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

describe('trip-snapshot', () => {
  test('buildTripSynthesis summarizes trip stats', () => {
    const synthesis = buildTripSynthesis({
      trip: {
        name: 'Provence',
        startDate: '2027-07-01',
        endDate: '2027-07-07',
        departureLocation: 'Bruxelles',
        budget: 2000,
        currency: 'EUR'
      },
      stages: [{
        id: 1,
        name: 'Avignon',
        startDate: '2027-07-01',
        endDate: '2027-07-04',
        activities: [
          { id: 1, cost: 50, reservationStatus: 'reserved' },
          { id: 2, cost: 30, reservationStatus: 'to_reserve' }
        ]
      }]
    }, 'fr')

    assert.strictEqual(synthesis.title, 'Provence')
    assert.ok(synthesis.stageOverview.some((line) => line.includes('Avignon')))
    assert.strictEqual(synthesis.stats.activityCount, 2)
    assert.strictEqual(synthesis.stats.totalCost, 80)
    assert.strictEqual(synthesis.stats.reservedCount, 1)
    assert.ok(synthesis.warnings.length > 0)
  })

  test('loadTripSnapshot loads trip with stage activities', async () => {
    const { user } = await createAuthenticatedAgent(app, { username: 'snapuser' })
    const trip = await createTripForUser(user.id, { name: 'Snapshot Trip' })
    const stage = await createStage(trip.id, {
      name: 'Lyon',
      startDate: '2027-08-01',
      endDate: '2027-08-05'
    })
    await createActivity(stage.id, { name: 'Food tour', activityTypeId: 3 })

    const snapshot = await loadTripSnapshot(trip.id)
    assert.ok(snapshot)
    assert.strictEqual(snapshot.trip.name, 'Snapshot Trip')
    assert.strictEqual(snapshot.stages.length, 1)
    assert.strictEqual(snapshot.stages[0].activities.length, 1)
    assert.strictEqual(snapshot.stages[0].activities[0].name, 'Food tour')
  })

  test('loadTripSnapshot returns null for missing trip', async () => {
    const snapshot = await loadTripSnapshot(999999)
    assert.strictEqual(snapshot, null)
  })
})
