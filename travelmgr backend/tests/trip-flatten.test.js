const { test, describe } = require('node:test')
const assert = require('node:assert')
const { flattenActivities, accommodationToActivity } = require('../utils/trip-flatten')

describe('trip-flatten', () => {
  test('accommodationToActivity maps legacy accommodation rows', () => {
    const activity = accommodationToActivity({
      id: 5,
      stageId: 2,
      name: 'Hotel Paris',
      city: 'Paris',
      addressLine: '1 rue Test',
      checkInDate: '2027-06-01',
      checkOutDate: '2027-06-03',
      totalCost: 240
    })

    assert.strictEqual(activity.activityTypeId, 7)
    assert.strictEqual(activity.activityType, 'hotel')
    assert.strictEqual(activity.address, '1 rue Test')
    assert.strictEqual(activity.cost, 240)
    assert.strictEqual(activity._fromAccommodationTable, true)
  })

  test('flattenActivities attaches stage metadata', () => {
    const snapshot = {
      stages: [{
        id: 10,
        name: 'Tokyo',
        activities: [
          { id: 1, name: 'Museum', activityTypeId: 2 },
          { id: 2, name: 'Hotel', activityTypeId: 7, stageId: 10 }
        ]
      }]
    }

    const flat = flattenActivities(snapshot)
    assert.strictEqual(flat.length, 2)
    assert.strictEqual(flat[0].stageName, 'Tokyo')
    assert.strictEqual(flat[0].stageId, 10)
    assert.strictEqual(flat[1].stageId, 10)
  })
})
