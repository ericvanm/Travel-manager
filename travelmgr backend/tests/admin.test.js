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
    await adminAgent.post('/api/auth/login').send({ username: 'adminlogin', password: 'secret' })

    const filtered = await adminAgent.get('/api/admin/trips').query({ userId: owner.id })
    assert.strictEqual(filtered.status, 200)
    assert.strictEqual(filtered.body.length, 2)
    assert.ok(filtered.body.every((trip) => trip.users.some((user) => user.id === owner.id)))

    const all = await adminAgent.get('/api/admin/trips')
    assert.strictEqual(all.status, 200)
    assert.strictEqual(all.body.length, 2)
  })
})

describe('GET /api/admin/users and ai-logs', () => {
  test('lists users and AI logs for admin', async () => {
    const { user } = await createAuthenticatedAgent(app, { username: 'loggeduser' })
    const { agent: adminAgent } = await createAuthenticatedAgent(app, { username: 'adminlogs' })
    await User.update({ role: 'admin' }, { where: { username: 'adminlogs' } })
    await adminAgent.post('/api/auth/login').send({ username: 'adminlogs', password: 'secret' })

    const { logAiInteraction } = require('../utils/ai-interaction-logger')
    const log = await logAiInteraction({
      userId: user.id,
      feature: 'planning',
      operation: 'synthesis',
      status: 'success'
    })

    const users = await adminAgent.get('/api/admin/users')
    assert.strictEqual(users.status, 200)
    assert.ok(users.body.some((entry) => entry.username === 'loggeduser'))

    const logs = await adminAgent.get('/api/admin/ai-logs').query({ feature: 'planning' })
    assert.strictEqual(logs.status, 200)
    assert.ok(logs.body.total >= 1)

    const detail = await adminAgent.get(`/api/admin/ai-logs/${log.id}`)
    assert.strictEqual(detail.status, 200)
    assert.ok(detail.text.includes('"feature":"planning"'))

    const missing = await adminAgent.get('/api/admin/ai-logs/99999')
    assert.strictEqual(missing.status, 404)

    const badUserId = await adminAgent.get('/api/admin/trips').query({ userId: 'abc' })
    assert.strictEqual(badUserId.status, 400)
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
