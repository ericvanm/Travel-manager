const { test, before, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const supertest = require('supertest')
const { connectToDatabase } = require('../utils/db')
const { resetDatabase, createTrip, createStage, createActivity } = require('./setup')

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

describe('activities API', () => {
  test('creates, reads, updates and deletes an activity', async () => {
    const trip = await createTrip()
    const stage = await createStage(trip.id)

    const created = await api.post('/api/activities').send({
      name: 'Louvre visit',
      stageId: stage.id,
      activityTypeId: 1,
      startDateTime: '2025-06-01T10:00:00Z',
      endDateTime: '2025-06-01T12:00:00Z'
    })
    assert.strictEqual(created.status, 200)
    const activityId = created.body.id

    const byStage = await api.get(`/api/activities/stage/${stage.id}`)
    assert.strictEqual(byStage.status, 200)
    assert.strictEqual(byStage.body.length, 1)

    const byId = await api.get(`/api/activities/${activityId}`)
    assert.strictEqual(byId.status, 200)

    const updated = await api.put(`/api/activities/${activityId}`).send({ name: 'Louvre updated' })
    assert.strictEqual(updated.status, 200)

    const deleted = await api.delete(`/api/activities/${activityId}`)
    assert.strictEqual(deleted.status, 204)
  })

  test('creates and updates hotel activities', async () => {
    const trip = await createTrip()
    const stage = await createStage(trip.id)

    const created = await api.post('/api/activities').send({
      name: 'Hotel ABC',
      stageId: stage.id,
      activityTypeId: 7,
      checkInDate: '2025-06-01T15:00:00Z',
      checkOutDate: '2025-06-03T11:00:00Z',
      address: '1 Main Street'
    })
    assert.strictEqual(created.status, 200)

    const updated = await api.put(`/api/activities/${created.body.id}`).send({
      checkInDate: '2025-06-02T15:00:00Z',
      checkOutDate: '2025-06-04T11:00:00Z'
    })
    assert.strictEqual(updated.status, 200)
    assert.ok(Array.isArray(updated.body))
  })

  test('returns 404 for unknown activity', async () => {
    const response = await api.get('/api/activities/99999')
    assert.strictEqual(response.status, 404)
  })

  test('returns timeline and duplicate analysis for a trip', async () => {
    const trip = await createTrip()
    const stage = await createStage(trip.id)
    await createActivity(stage.id, { name: 'Duplicate', startDateTime: '2025-06-01T10:00:00Z' })
    await createActivity(stage.id, {
      name: 'Duplicate',
      startDateTime: '2025-06-01T10:00:00Z',
      endDateTime: '2025-06-01T12:00:00Z'
    })

    const duplicates = await api.get(`/api/activities/analyze-duplicates/${trip.id}`)
    assert.strictEqual(duplicates.status, 200)
    assert.ok(duplicates.body.count >= 0)

    const timeline = await api.get(`/api/activities/timeline/${trip.id}`)
    assert.strictEqual(timeline.status, 200)
    assert.ok(Array.isArray(timeline.body))
  })

  test('structures trip and removes duplicates', async () => {
    const trip = await createTrip()
    const stage = await createStage(trip.id)
    await createActivity(stage.id, {
      name: 'Same activity',
      activityTypeId: 1,
      startDateTime: '2025-06-01T10:00:00Z',
      endDateTime: '2025-06-01T11:00:00Z'
    })
    await createActivity(stage.id, {
      name: 'Same activity',
      activityTypeId: 1,
      startDateTime: '2025-06-01T10:00:00Z',
      endDateTime: '2025-06-01T11:00:00Z'
    })

    const response = await api.post(`/api/activities/structure-trip/${trip.id}`)
    assert.strictEqual(response.status, 200)
    assert.match(response.body.message, /structured/)
  })
})
