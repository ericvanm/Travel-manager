const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const {
  buildActivityCreatePayload,
  sanitizeActivityPayload,
  resolveStageIdForActivityChange
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
