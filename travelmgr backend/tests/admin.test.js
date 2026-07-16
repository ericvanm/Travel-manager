const { test, before, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const { connectToDatabase } = require('../utils/db')
const { User, TripPlanningSession } = require('../models/DBmodels')
const {
  resetDatabase,
  createTrip,
  createTripForUser,
  createAuthenticatedAgent
} = require('./setup')

let app

before(async () => {
  await connectToDatabase()
  app = require('../app')
})

beforeEach(async () => {
  await resetDatabase()
})

describe('GET /api/admin/trips', () => {
  test('filters trips by userId from trip_lists and planning sessions', async () => {
    const { user: owner } = await createAuthenticatedAgent(app, {
      username: 'owner',
      name: 'Trip Owner'
    })

    await createTripForUser(owner.id, { name: 'Linked Trip' })
    const orphanTrip = await createTrip({ name: 'Legacy Trip' })
    await TripPlanningSession.create({
      userId: owner.id,
      tripId: orphanTrip.id,
      status: 'accepted',
      formData: {}
    })

    const { agent: adminAgent } = await createAuthenticatedAgent(app, {
      username: 'adminlogin',
      name: 'Admin Login'
    })
    await User.update({ role: 'admin' }, { where: { username: 'adminlogin' } })

    const filtered = await adminAgent.get('/api/admin/trips').query({ userId: owner.id })
    assert.strictEqual(filtered.status, 200)
    assert.strictEqual(filtered.body.length, 2)
    assert.ok(filtered.body.every((trip) => trip.users.some((user) => user.id === owner.id)))

    const all = await adminAgent.get('/api/admin/trips')
    assert.strictEqual(all.status, 200)
    assert.strictEqual(all.body.length, 2)
  })
})

describe('GET /api/trips regression', () => {
  test('returns all trips for authenticated users', async () => {
    const { agent } = await createAuthenticatedAgent(app, { username: 'viewer' })
    await createTrip({ name: 'Trip A' })
    await createTrip({ name: 'Trip B' })

    const response = await agent.get('/api/trips')
    assert.strictEqual(response.status, 200)
    assert.strictEqual(response.body.length, 2)
  })
})
