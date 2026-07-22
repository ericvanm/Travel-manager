const { test, before, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const supertest = require('supertest')
const { connectToDatabase } = require('../utils/db')
const { resetDatabase, createTrip, createTripForUser, createAuthenticatedAgent } = require('./setup')

let app
let api

before(async () => {
  await connectToDatabase()
  app = require('../app')
  api = supertest(app)
})

beforeEach(async () => {
  await resetDatabase()
})

describe('GET /api/trips', () => {
  test('requires authentication', async () => {
    const response = await api.get('/api/trips')
    assert.strictEqual(response.status, 401)
  })

  test('returns only trips owned by the user', async () => {
    const { agent, user } = await createAuthenticatedAgent(app, { username: 'owner1' })
    await createTripForUser(user.id, { name: 'My Trip' })
    await createTrip({ name: 'Other Trip' })

    const response = await agent.get('/api/trips')
    assert.strictEqual(response.status, 200)
    assert.strictEqual(response.body.length, 1)
    assert.strictEqual(response.body[0].name, 'My Trip')
  })
})

describe('POST /api/trips', () => {
  test('creates a trip linked to the authenticated user', async () => {
    const { agent } = await createAuthenticatedAgent(app, { username: 'creator' })

    const response = await agent
      .post('/api/trips')
      .send({ name: 'New Trip', description: 'Summer vacation' })

    assert.strictEqual(response.status, 200)
    assert.strictEqual(response.body.name, 'New Trip')

    const list = await agent.get('/api/trips')
    assert.strictEqual(list.body.length, 1)
  })

  test('rejects duplicate trip name', async () => {
    const { agent } = await createAuthenticatedAgent(app, { username: 'dupuser' })
    await agent.post('/api/trips').send({ name: 'Duplicate Trip', description: 'First' })

    const response = await agent
      .post('/api/trips')
      .send({ name: 'Duplicate Trip', description: 'Another one' })

    assert.strictEqual(response.status, 400)
    assert.strictEqual(response.body.error, 'trip_name_exists')
  })
})

describe('GET /api/trips/:id', () => {
  test('returns a trip owned by the user', async () => {
    const { agent, user } = await createAuthenticatedAgent(app, { username: 'viewer' })
    const trip = await createTripForUser(user.id, { name: 'Single Trip' })

    const response = await agent.get(`/api/trips/${trip.id}`)
    assert.strictEqual(response.status, 200)
    assert.strictEqual(response.body.name, 'Single Trip')
  })

  test('returns 404 for a trip owned by another user', async () => {
    const { agent } = await createAuthenticatedAgent(app, { username: 'alice' })
    const otherTrip = await createTrip({ name: 'Private Trip' })

    const response = await agent.get(`/api/trips/${otherTrip.id}`)
    assert.strictEqual(response.status, 404)
  })

  test('returns 404 for unknown trip', async () => {
    const { agent } = await createAuthenticatedAgent(app, { username: 'ghost' })
    const response = await agent.get('/api/trips/99999')
    assert.strictEqual(response.status, 404)
  })
})

describe('PUT /api/trips/:id', () => {
  test('updates an owned trip', async () => {
    const { agent, user } = await createAuthenticatedAgent(app, { username: 'editor' })
    const trip = await createTripForUser(user.id, { name: 'Old Name' })

    const response = await agent
      .put(`/api/trips/${trip.id}`)
      .send({ name: 'Updated Name', description: 'Updated' })

    assert.strictEqual(response.status, 200)
    assert.strictEqual(response.body.name, 'Updated Name')
  })
})

describe('DELETE /api/trips/:id', () => {
  test('deletes an owned trip', async () => {
    const { agent, user } = await createAuthenticatedAgent(app, { username: 'deleter' })
    const trip = await createTripForUser(user.id, { name: 'To Delete' })

    const response = await agent.delete(`/api/trips/${trip.id}`)
    assert.strictEqual(response.status, 200)

    const getResponse = await agent.get(`/api/trips/${trip.id}`)
    assert.strictEqual(getResponse.status, 404)
  })
})
