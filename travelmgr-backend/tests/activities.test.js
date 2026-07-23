const { test, before, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const { connectToDatabase } = require('../utils/db')
const { resetDatabase, createTripForUser, createStage, createActivity, createAuthenticatedAgent } = require('./setup')

let app

before(async () => {
  await connectToDatabase()
  app = require('../app')
})

beforeEach(async () => {
  await resetDatabase()
})

describe('activities API', () => {
  test('creates, reads, updates and deletes an activity', async () => {
    const { agent, user } = await createAuthenticatedAgent(app, { username: 'actuser' })
    const trip = await createTripForUser(user.id)
    const stage = await createStage(trip.id)

    const created = await agent.post('/api/activities').send({
      name: 'Louvre visit',
      stageId: stage.id,
      activityTypeId: 1,
      startDateTime: '2025-06-01T10:00:00Z',
      endDateTime: '2025-06-01T12:00:00Z'
    })
    assert.strictEqual(created.status, 200)
    const activityId = created.body.id

    const byStage = await agent.get(`/api/activities/stage/${stage.id}`)
    assert.strictEqual(byStage.status, 200)
    assert.strictEqual(byStage.body.length, 1)

    const byId = await agent.get(`/api/activities/${activityId}`)
    assert.strictEqual(byId.status, 200)

    const updated = await agent.put(`/api/activities/${activityId}`).send({ name: 'Louvre updated' })
    assert.strictEqual(updated.status, 200)

    const deleted = await agent.delete(`/api/activities/${activityId}`)
    assert.strictEqual(deleted.status, 204)
  })

  test('creates and updates hotel activities', async () => {
    const { agent, user } = await createAuthenticatedAgent(app, { username: 'hoteluser' })
    const trip = await createTripForUser(user.id)
    const stage = await createStage(trip.id)

    const created = await agent.post('/api/activities').send({
      name: 'Hotel ABC',
      stageId: stage.id,
      activityTypeId: 7,
      checkInDate: '2025-06-01T15:00:00Z',
      checkOutDate: '2025-06-01T18:00:00Z',
      address: '1 Main Street'
    })
    assert.strictEqual(created.status, 200)
    const activity = Array.isArray(created.body) ? created.body[0] : created.body

    const updated = await agent.put(`/api/activities/${activity.id}`).send({
      checkInDate: '2025-06-01T16:00:00Z',
      checkOutDate: '2025-06-01T19:00:00Z'
    })
    assert.strictEqual(updated.status, 200)
    assert.ok(Array.isArray(updated.body))
  })

  test('returns 404 for unknown activity', async () => {
    const { agent } = await createAuthenticatedAgent(app, { username: 'unknownact' })
    const response = await agent.get('/api/activities/99999')
    assert.strictEqual(response.status, 404)
  })

  test('returns timeline and duplicate analysis for a trip', async () => {
    const { agent, user } = await createAuthenticatedAgent(app, { username: 'dupuser' })
    const trip = await createTripForUser(user.id)
    const stage = await createStage(trip.id)
    await createActivity(stage.id, { name: 'Duplicate', startDateTime: '2025-06-01T10:00:00Z' })
    await createActivity(stage.id, {
      name: 'Duplicate',
      startDateTime: '2025-06-01T10:00:00Z',
      endDateTime: '2025-06-01T12:00:00Z'
    })

    const duplicates = await agent.get(`/api/activities/analyze-duplicates/${trip.id}`)
    assert.strictEqual(duplicates.status, 200)
    assert.ok(duplicates.body.count >= 0)

    const timeline = await agent.get(`/api/activities/timeline/${trip.id}`)
    assert.strictEqual(timeline.status, 200)
    assert.ok(Array.isArray(timeline.body))
  })

  test('structures trip and removes duplicates', async () => {
    const { agent, user } = await createAuthenticatedAgent(app, { username: 'structuser' })
    const trip = await createTripForUser(user.id)
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

    const response = await agent.post(`/api/activities/structure-trip/${trip.id}`)
    assert.strictEqual(response.status, 200)
    assert.match(response.body.message, /structured/)
  })
})
