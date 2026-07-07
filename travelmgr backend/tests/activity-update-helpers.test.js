const { test, describe } = require('node:test')
const assert = require('node:assert')
const {
  applyHotelDateSync,
  haveDatesChanged,
  resetGroupedActivity,
  updateGroupedActivities
} = require('../utils/activity-update-helpers')

describe('activity-update-helpers', () => {
  test('applyHotelDateSync syncs hotel check-in and check-out dates', () => {
    const activity = { activityTypeId: 7 }
    const result = applyHotelDateSync({}, {
      checkInDate: '2025-06-01T15:00:00Z',
      checkOutDate: '2025-06-03T11:00:00Z'
    }, activity)

    assert.strictEqual(result.startDateTime, '2025-06-01T15:00:00Z')
    assert.strictEqual(result.endDateTime, '2025-06-03T11:00:00Z')
  })

  test('applyHotelDateSync ignores non-hotel activities', () => {
    const activity = { activityTypeId: 1 }
    const result = applyHotelDateSync({ name: 'Museum' }, { checkInDate: '2025-06-01' }, activity)
    assert.strictEqual(result.name, 'Museum')
    assert.strictEqual(result.startDateTime, undefined)
  })

  test('haveDatesChanged detects changed start or end date', () => {
    const activity = { startDateTime: '2025-06-01', endDateTime: '2025-06-02' }
    assert.ok(!haveDatesChanged(activity, { startDateTime: '2025-06-01' }))
    assert.strictEqual(haveDatesChanged(activity, { endDateTime: '2025-06-05' }), true)
  })

  test('resetGroupedActivity clears group and updates activity', async () => {
    const destroyed = []
    const updates = []
    const activity = {
      groupId: 'group-1',
      update: async (data) => {
        updates.push(data)
        return activity
      }
    }
    const Activity = {
      destroy: async ({ where }) => {
        destroyed.push(where)
      }
    }

    const result = await resetGroupedActivity(Activity, activity, { name: 'Updated' })
    assert.strictEqual(result.length, 1)
    assert.strictEqual(updates[0].groupId, null)
    assert.strictEqual(destroyed[0].groupId, 'group-1')
  })

  test('updateGroupedActivities updates all grouped records', async () => {
    const groupActivity = {
      update: async (data) => {
        groupActivity.name = data.name
      }
    }
    const Activity = {
      findAll: async () => [groupActivity]
    }

    const result = await updateGroupedActivities(Activity, { groupId: 'group-1' }, { name: 'Shared name' })
    assert.strictEqual(result.length, 1)
    assert.strictEqual(groupActivity.name, 'Shared name')
  })
})
