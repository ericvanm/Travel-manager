const { test, before, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const supertest = require('supertest')
const { connectToDatabase } = require('../utils/db')
const { resetDatabase, getDefaultCountryId, createTrip, createStage, createActivity } = require('./setup')

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

describe('stages API', () => {
  test('creates, lists, updates and deletes a stage', async () => {
    const trip = await createTrip({ name: 'Stage Trip' })
    const countryId = await getDefaultCountryId()
    const created = await api.post('/api/stages').send({
      name: 'Paris',
      tripId: trip.id,
      countryId,
      startDate: '2025-06-01',
      endDate: '2025-06-05'
    })

    assert.strictEqual(created.status, 200)
    const stageId = created.body.id

    const list = await api.get(`/api/stages/trip/${trip.id}`)
    assert.strictEqual(list.status, 200)
    assert.strictEqual(list.body.length, 1)

    const updated = await api.put(`/api/stages/${stageId}`).send({ name: 'Paris Updated' })
    assert.strictEqual(updated.status, 200)
    assert.strictEqual(updated.body.name, 'Paris Updated')

    const deleted = await api.delete(`/api/stages/${stageId}`)
    assert.strictEqual(deleted.status, 200)
    assert.match(deleted.body.message, /supprimée/)
  })

  test('returns 404 for unknown stage', async () => {
    const response = await api.get('/api/stages/99999')
    assert.strictEqual(response.status, 404)
  })

  test('merges consecutive stages', async () => {
    const trip = await createTrip({ name: 'Merge Trip' })
    const stage1 = await createStage(trip.id, { name: 'Day 1', startDate: '2025-06-01', endDate: '2025-06-01' })
    const stage2 = await createStage(trip.id, { name: 'Day 2', startDate: '2025-06-02', endDate: '2025-06-02' })
    await createActivity(stage1.id, { name: 'Morning visit' })
    await createActivity(stage2.id, { name: 'Evening show' })

    const response = await api.post('/api/stages/merge').send({
      stageIds: [stage1.id, stage2.id],
      newName: 'Combined stage'
    })

    assert.strictEqual(response.status, 200)
    assert.ok(response.body.mergedStage)
    assert.match(response.body.message, /fusionnées/)
  })

  test('rejects invalid merge payload', async () => {
    const response = await api.post('/api/stages/merge').send({ stageIds: [1], newName: 'X' })
    assert.strictEqual(response.status, 400)
  })
})
