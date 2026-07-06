const { test, before, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const supertest = require('supertest')
const { connectToDatabase } = require('../utils/db')
const { resetDatabase, createTrip } = require('./setup')

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
  test('returns empty list initially', async () => {
    const response = await api.get('/api/trips')
    assert.strictEqual(response.status, 200)
    assert.deepStrictEqual(response.body, [])
  })

  test('returns all trips', async () => {
    await createTrip({ name: 'Paris 2026' })
    await createTrip({ name: 'Tokyo 2026' })

    const response = await api.get('/api/trips')
    assert.strictEqual(response.status, 200)
    assert.strictEqual(response.body.length, 2)
  })
})

describe('POST /api/trips', () => {
  test('creates a trip', async () => {
    const response = await api
      .post('/api/trips')
      .send({ name: 'New Trip', description: 'Summer vacation' })

    assert.strictEqual(response.status, 200)
    assert.strictEqual(response.body.name, 'New Trip')
    assert.ok(response.body.id)
  })

  test('rejects duplicate trip name', async () => {
    await createTrip({ name: 'Duplicate Trip' })

    const response = await api
      .post('/api/trips')
      .send({ name: 'Duplicate Trip', description: 'Another one' })

    assert.strictEqual(response.status, 400)
    assert.strictEqual(response.body.error, 'trip_name_exists')
  })
})

describe('GET /api/trips/:id', () => {
  test('returns a trip by id', async () => {
    const trip = await createTrip({ name: 'Single Trip' })

    const response = await api.get(`/api/trips/${trip.id}`)
    assert.strictEqual(response.status, 200)
    assert.strictEqual(response.body.name, 'Single Trip')
  })

  test('returns 404 for unknown trip', async () => {
    const response = await api.get('/api/trips/99999')
    assert.strictEqual(response.status, 404)
    assert.strictEqual(response.body.error, 'Trip not found')
  })
})

describe('PUT /api/trips/:id', () => {
  test('updates a trip', async () => {
    const trip = await createTrip({ name: 'Old Name' })

    const response = await api
      .put(`/api/trips/${trip.id}`)
      .send({ name: 'Updated Name', description: 'Updated' })

    assert.strictEqual(response.status, 200)
    assert.strictEqual(response.body.name, 'Updated Name')
  })

  test('returns 404 for unknown trip', async () => {
    const response = await api
      .put('/api/trips/99999')
      .send({ name: 'Ghost Trip' })

    assert.strictEqual(response.status, 404)
  })
})

describe('DELETE /api/trips/:id', () => {
  test('deletes a trip', async () => {
    const trip = await createTrip({ name: 'To Delete' })

    const response = await api.delete(`/api/trips/${trip.id}`)
    assert.strictEqual(response.status, 200)
    assert.match(response.body.message, /To Delete/)

    const getResponse = await api.get(`/api/trips/${trip.id}`)
    assert.strictEqual(getResponse.status, 404)
  })

  test('returns 404 for unknown trip', async () => {
    const response = await api.delete('/api/trips/99999')
    assert.strictEqual(response.status, 404)
  })
})
