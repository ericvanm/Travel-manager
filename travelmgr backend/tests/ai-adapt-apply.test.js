const { test, before, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const { connectToDatabase } = require('../utils/db')
const { applyProposedChanges, normalizeProposedChanges } = require('../utils/ai-adapt-service')
const {
  resetDatabase,
  createAuthenticatedAgent,
  createTripForUser,
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

describe('applyProposedChanges integration', () => {
  test('updates an existing activity in database', async () => {
    const { user } = await createAuthenticatedAgent(app, { username: 'applyuser' })
    const trip = await createTripForUser(user.id, { name: 'Apply Trip' })
    const stage = await createStage(trip.id, {
      name: 'Paris',
      startDate: '2027-06-01',
      endDate: '2027-06-05'
    })
    const activity = await createActivity(stage.id, {
      name: 'Old activity',
      activityTypeId: 3,
      startDateTime: '2027-06-02T10:00:00.000Z',
      endDateTime: '2027-06-02T12:00:00.000Z'
    })

    const applied = await applyProposedChanges(trip.id, normalizeProposedChanges({
      changes: [{
        action: 'update',
        entityType: 'activity',
        entityId: activity.id,
        description: 'Renamed',
        data: { name: 'New activity name' }
      }]
    }))

    assert.strictEqual(applied.activities, 1)
    await activity.reload()
    assert.strictEqual(activity.name, 'New activity name')
  })
})
