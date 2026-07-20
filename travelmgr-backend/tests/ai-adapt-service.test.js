const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const {
  buildActivityCreatePayload,
  sanitizeActivityPayload,
  resolveStageIdForActivityChange,
  detectReservedImpacts,
  normalizeProposedChanges,
  buildAdaptPrompt,
} = require('../utils/ai-adapt-service')

describe('ai-adapt-service activity create', () => {
  const stages = [
    { id: 10, name: 'Bangkok', startDate: '2027-05-01', endDate: '2027-05-05' },
    { id: 11, name: 'Chiang Mai', startDate: '2027-05-06', endDate: '2027-05-10' },
    { id: 12, name: 'Koh Lanta', startDate: '2027-05-11', endDate: '2027-05-15' },
    { id: 13, name: 'Koh Phi Phi', startDate: '2027-05-16', endDate: '2027-05-20' }
  ]

  it('keeps stageId in create payload after sanitization', () => {
    const change = {
      action: 'create',
      entityType: 'activity',
      location: 'Bangkok',
      activityType: 'tour',
      startDateTime: '2027-05-04T11:00:00Z',
      endDateTime: '2027-05-04T14:00:00Z',
      description: 'Grand Palace tour'
    }
    const payload = buildActivityCreatePayload(change, 10)
    assert.equal(payload.stageId, 10)
    assert.equal(payload.activityTypeId, 3)
  })

  it('resolves stageId from location and date when AI omits stageId', () => {
    const change = {
      location: 'Koh Phi Phi',
      startDateTime: '2027-05-19T11:00:00Z'
    }
    assert.equal(resolveStageIdForActivityChange(change, stages), 13)
  })

  it('resolves stageId from location alone', () => {
    const change = { location: 'Chiang Mai' }
    assert.equal(resolveStageIdForActivityChange(change, stages), 11)
  })

  it('does not strip stageId in sanitizeActivityPayload', () => {
    const cleaned = sanitizeActivityPayload({ stageId: 10, name: 'Test', activityTypeId: 3 }, 3)
    assert.equal(cleaned.stageId, 10)
  })
})

describe('ai-adapt-service reserved impacts and prompts', () => {
  const snapshot = {
    stages: [{
      id: 1,
      name: 'Paris',
      activities: [{
        id: 42,
        name: 'Reserved hotel',
        reservationStatus: 'reserved'
      }]
    }]
  }

  it('detectReservedImpacts flags changes on reserved activities', () => {
    const impacts = detectReservedImpacts(snapshot, {
      changes: [{
        action: 'update',
        entityType: 'activity',
        entityId: 42,
        description: 'Change dates'
      }],
      reservedWarnings: []
    })
    assert.equal(impacts.length, 1)
    assert.equal(impacts[0].entityId, 42)
  })

  it('normalizeProposedChanges merges nested activity detail fields', () => {
    const normalized = normalizeProposedChanges({
      changes: [{
        action: 'update',
        entityType: 'activity',
        activityType: 'flight',
        data: {
          flightNumber: 'AF123',
          departureLocation: 'Paris'
        }
      }]
    })
    assert.equal(normalized.changes[0].flightNumber, 'AF123')
    assert.equal(normalized.changes[0].departureLocation, 'Paris')
  })

  it('buildAdaptPrompt isolates user request and redacts sensitive snapshot fields', () => {
    const prompt = buildAdaptPrompt({
      trip: {
        id: 1,
        name: 'Trip',
        description: 'Desc',
        startDate: '2027-06-01',
        endDate: '2027-06-05',
        budget: 1000,
        currency: 'EUR',
        departureLocation: 'Brussels'
      },
      stages: [{
        id: 1,
        name: 'Paris',
        countryId: 1,
        startDate: '2027-06-01',
        endDate: '2027-06-05',
        activities: [{
          id: 1,
          activityTypeId: 6,
          name: 'Flight',
          confirmationCode: 'SECRET',
          confirmationNumber: 'PNR-1'
        }]
      }]
    }, 'Add a museum visit', 'fr')

    assert.ok(prompt.includes('Add a museum visit'))
    assert.ok(prompt.includes('---'))
    assert.ok(!prompt.includes('SECRET'))
    assert.ok(!prompt.includes('PNR-1'))
  })

  it('sanitizeActivityPayload normalizes hotel dates and strips AI metadata', () => {
    const cleaned = sanitizeActivityPayload({
      entityType: 'activity',
      action: 'create',
      activityType: 'hotel',
      checkInDate: '2027-06-01',
      checkOutDate: '2027-06-01',
      name: 'Hotel Paris',
      cost: 120
    }, 7)

    assert.equal(cleaned.name, 'Hotel Paris')
    assert.equal(cleaned.cost, 120)
    assert.ok(cleaned.startDateTime)
    assert.equal(cleaned.checkOutDate, '2027-06-02')
  })

  it('buildActivityCreatePayload normalizes hotel booking fields', () => {
    const payload = buildActivityCreatePayload({
      action: 'create',
      entityType: 'activity',
      location: 'Paris',
      activityType: 'hotel',
      checkInDate: '2027-06-01',
      checkOutDate: '2027-06-03',
      name: 'Hotel Paris',
      estimatedCost: 180,
      description: 'Central hotel'
    }, 10)

    assert.equal(payload.stageId, 10)
    assert.equal(payload.activityTypeId, 7)
    assert.equal(payload.cost, 180)
    assert.ok(payload.startDateTime)
  })
})
