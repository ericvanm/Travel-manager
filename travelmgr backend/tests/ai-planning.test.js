const { test, before, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const { connectToDatabase } = require('../utils/db')
const { TripPlanningSession } = require('../models/DBmodels')
const { createAuthenticatedAgent, resetDatabase } = require('./setup')

let app

const validForm = {
  departureLocation: 'Bruxelles, Belgique',
  geographicZone: 'Provence, France',
  durationDays: 7,
  startDate: '2027-08-01',
  travelStyle: 'culturel et découverte',
  localTransport: 'voiture',
  accommodationType: 'hôtel',
  budget: 2500,
  currency: 'EUR'
}

before(async () => {
  process.env.USE_OPENAI = 'false'
  delete process.env.OPENAI_API_KEY
  await connectToDatabase()
  app = require('../app')
})

beforeEach(async () => {
  await resetDatabase()
})

describe('AI planning API', () => {
  test('GET /inspiration-sites returns configured sites', async () => {
    const { agent } = await createAuthenticatedAgent(app, { username: 'planinsp' })
    const response = await agent.get('/api/ai-planning/inspiration-sites')
    assert.strictEqual(response.status, 200)
    assert.ok(Array.isArray(response.body.sites))
    assert.ok(response.body.sites.some((site) => site.name === 'GetYourGuide'))
  })

  test('planning session lifecycle creates a trip from fallback itinerary', async () => {
    const { agent, user } = await createAuthenticatedAgent(app, { username: 'planflow' })

    const created = await agent.post('/api/ai-planning/sessions').send({ formData: validForm })
    assert.strictEqual(created.status, 200)
    const sessionId = created.body.id

    const listed = await agent.get('/api/ai-planning/sessions')
    assert.strictEqual(listed.status, 200)
    assert.ok(listed.body.some((session) => session.id === sessionId))

    const fetched = await agent.get(`/api/ai-planning/sessions/${sessionId}`)
    assert.strictEqual(fetched.status, 200)

    const validated = await agent.post(`/api/ai-planning/sessions/${sessionId}/validate`).send({ formData: validForm })
    assert.strictEqual(validated.status, 200)
    assert.strictEqual(validated.body.success, true)
    assert.ok(validated.body.synthesis)

    const confirmed = await agent.post(`/api/ai-planning/sessions/${sessionId}/confirm-synthesis`)
    assert.strictEqual(confirmed.status, 200)
    assert.ok(confirmed.body.itinerary?.stages?.length > 0)

    const revised = await agent.post(`/api/ai-planning/sessions/${sessionId}/revise`).send({
      feedback: 'Ajouter plus de musées'
    })
    assert.strictEqual(revised.status, 200)
    assert.ok(revised.body.itinerary)

    const accepted = await agent.post(`/api/ai-planning/sessions/${sessionId}/accept`)
    assert.strictEqual(accepted.status, 200)
    assert.ok(accepted.body.trip?.id)

    const session = await TripPlanningSession.findByPk(sessionId)
    assert.strictEqual(session.status, 'accepted')
    assert.strictEqual(session.userId, user.id)
    assert.strictEqual(session.tripId, accepted.body.trip.id)
  })

  test('POST /sessions updates an existing session when sessionId is provided', async () => {
    const { agent } = await createAuthenticatedAgent(app, { username: 'planupdate' })
    const first = await agent.post('/api/ai-planning/sessions').send({ formData: validForm })
    const updated = await agent.post('/api/ai-planning/sessions').send({
      sessionId: first.body.id,
      formData: { ...validForm, travelStyle: 'gastronomie' }
    })
    assert.strictEqual(updated.status, 200)
    assert.strictEqual(updated.body.id, first.body.id)
    assert.strictEqual(updated.body.formData.travelStyle, 'gastronomie')
  })

  test('validation rejects invalid form data', async () => {
    const { agent } = await createAuthenticatedAgent(app, { username: 'planinvalid' })
    const created = await agent.post('/api/ai-planning/sessions').send({
      formData: { ...validForm, geographicZone: '' }
    })
    const response = await agent.post(`/api/ai-planning/sessions/${created.body.id}/validate`).send({
      formData: { ...validForm, geographicZone: '' }
    })
    assert.strictEqual(response.status, 400)
    assert.strictEqual(response.body.success, false)
    assert.strictEqual(response.body.requiresFormCorrection, true)
  })

  test('reject and error paths return expected statuses', async () => {
    const { agent } = await createAuthenticatedAgent(app, { username: 'planerrors' })
    const created = await agent.post('/api/ai-planning/sessions').send({ formData: validForm })

    const missing = await agent.get('/api/ai-planning/sessions/99999')
    assert.strictEqual(missing.status, 404)

    const noItinerary = await agent.post(`/api/ai-planning/sessions/${created.body.id}/accept`)
    assert.strictEqual(noItinerary.status, 400)

    const noFeedback = await agent.post(`/api/ai-planning/sessions/${created.body.id}/revise`).send({ feedback: '  ' })
    assert.strictEqual(noFeedback.status, 400)

    const rejected = await agent.post(`/api/ai-planning/sessions/${created.body.id}/reject`)
    assert.strictEqual(rejected.status, 200)
    assert.strictEqual(rejected.body.success, true)
  })
})
