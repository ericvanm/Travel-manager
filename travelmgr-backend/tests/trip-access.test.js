const { test, describe } = require('node:test')
const assert = require('node:assert')
const {
  userCanAccessTrip,
  parseTripId
} = require('../utils/trip-access')

describe('trip-access', () => {
  test('parseTripId accepts positive integers only', () => {
    assert.strictEqual(parseTripId('12'), 12)
    assert.strictEqual(parseTripId(0), null)
    assert.strictEqual(parseTripId('abc'), null)
  })

  test('userCanAccessTrip returns false for invalid ids', async () => {
    assert.strictEqual(await userCanAccessTrip(null, 1), false)
    assert.strictEqual(await userCanAccessTrip(1, null), false)
  })
})
