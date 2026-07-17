const { test, before, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const { connectToDatabase } = require('../utils/db')
const { TripAdaptationSession } = require('../models/DBmodels')
const {
  resetDatabase,
  createAuthenticatedAgent,
  createTripForUser,
  createStage,
  createActivity
} = require('./setup')

let app

before(async () => {
  process.env.USE_OPENAI = 'false'
  delete process.env.OPENAI_API_KEY
  await connectToDatabase()
  app = require('../app')
})

beforeEach(async () => {
  await resetDatabase()
})

const buildTripWithActivity = async (username) => {
  const { agent, user } = await createAuthenticatedAgent(app, { username })
  const trip = await createTripForUser(user.id, {
    name: `Adapt Trip ${username}`,
    startDate: '2027-09-01',
    endDate: '2027-09-05'
  })
  const stage = await createStage(trip.id, {
    name: 'Paris',
    startDate: '2027-09-01',
    endDate: '2027-09-05'
  })
  const activity = await createActivity(stage.id, {
    name: 'Louvre visit',
    activityTypeId: 3,
    startDateTime: '2027-09-02T10:00:00.000Z',
    endDateTime: '2027-09-02T12:00:00.000Z'
  })
  await createActivity(stage.id, {
    name: 'Hotel Paris',
    activityTypeId: 7,
    checkInDate: '2027-09-01',
    checkOutDate: '2027-09-05',
    city: 'Paris'
  })
  return { agent, user, trip, stage, activity }
}

describe('AI adapt API', () => {
  test('POST /trips/:tripId/start opens an adaptation session', async () => {
    const { agent, trip } = await buildTripWithActivity('adaptstart')

    const response = await agent.post(`/api/ai-adapt/trips/${trip.id}/start`)
    assert.strictEqual(response.status, 200)
    assert.ok(response.body.sessionId)
    assert.ok(response.body.synthesis?.summary)
    assert.ok(response.body.snapshot?.stages?.length > 0)
  })

  test('propose, reject and accept adaptation changes', async () => {
    const { agent, user, trip, activity } = await buildTripWithActivity('adaptflow')

    const started = await agent.post(`/api/ai-adapt/trips/${trip.id}/start`)
    const sessionId = started.body.sessionId

    const proposed = await agent.post(`/api/ai-adapt/sessions/${sessionId}/propose`).send({
      adaptationRequest: 'Renommer la visite du Louvre'
    })
    assert.strictEqual(proposed.status, 200)
    assert.strictEqual(proposed.body.success, true)

    const fetched = await agent.get(`/api/ai-adapt/sessions/${sessionId}`)
    assert.strictEqual(fetched.status, 200)
    assert.strictEqual(fetched.body.status, 'proposal_ready')

    await TripAdaptationSession.update({
      proposedChanges: {
        changes: [{
          action: 'update',
          entityType: 'activity',
          entityId: activity.id,
          description: 'Renamed visit',
          data: { name: 'Musée du Louvre' }
        }]
      }
    }, { where: { id: sessionId } })

    const accepted = await agent.post(`/api/ai-adapt/sessions/${sessionId}/accept`)
    assert.strictEqual(accepted.status, 200)
    assert.strictEqual(accepted.body.success, true)
    assert.ok(accepted.body.applied.activities >= 1)

    await activity.reload()
    assert.strictEqual(activity.name, 'Musée du Louvre')

    const rejectedSession = await TripAdaptationSession.create({
      userId: user.id,
      tripId: trip.id,
      status: 'proposal_ready',
      tripSnapshot: started.body.snapshot,
      proposedChanges: { changes: [] }
    })
    const rejected = await agent.post(`/api/ai-adapt/sessions/${rejectedSession.id}/reject`)
    assert.strictEqual(rejected.status, 200)
    assert.strictEqual(rejected.body.success, true)
  })

  test('POST /trips/:tripId/resolve-consistency handles consistent and inconsistent trips', async () => {
    const { validateTripConsistency } = require('../utils/trip-consistency')
    const { agent, trip } = await buildTripWithActivity('adaptconsist')

    const started = await agent.post(`/api/ai-adapt/trips/${trip.id}/start`)
    const report = validateTripConsistency(started.body.snapshot)
    const fixable = report.errorCount > 0 || report.warningCount > 0

    const consistent = await agent.post(`/api/ai-adapt/trips/${trip.id}/resolve-consistency`)
    assert.strictEqual(consistent.status, 200)
    assert.strictEqual(consistent.body.alreadyConsistent, !fixable)

    const { agent: agent2, trip: badTrip } = await buildTripWithActivity('adaptbad')
    await createActivity((await createStage(badTrip.id, {
      name: 'Tokyo',
      startDate: '2027-10-01',
      endDate: '2027-10-03'
    })).id, {
      name: 'Museum',
      activityTypeId: 2,
      startDateTime: '2027-10-01T10:00:00.000Z',
      endDateTime: '2027-10-01T12:00:00.000Z'
    })

    const resolved = await agent2.post(`/api/ai-adapt/trips/${badTrip.id}/resolve-consistency`)
    assert.strictEqual(resolved.status, 200)
    assert.strictEqual(resolved.body.alreadyConsistent, false)
    assert.ok(resolved.body.sessionId)
    assert.ok(resolved.body.adaptationRequest)
  })

  test('returns expected errors for missing resources and invalid input', async () => {
    const { agent, trip } = await buildTripWithActivity('adapterrors')
    const started = await agent.post(`/api/ai-adapt/trips/${trip.id}/start`)

    const missingTrip = await agent.post('/api/ai-adapt/trips/99999/start')
    assert.strictEqual(missingTrip.status, 404)

    const missingSession = await agent.get('/api/ai-adapt/sessions/99999')
    assert.strictEqual(missingSession.status, 404)

    const missingRequest = await agent.post(`/api/ai-adapt/sessions/${started.body.sessionId}/propose`).send({
      adaptationRequest: '   '
    })
    assert.strictEqual(missingRequest.status, 400)

    const noChanges = await agent.post(`/api/ai-adapt/sessions/${started.body.sessionId}/accept`)
    assert.strictEqual(noChanges.status, 400)
  })
})
