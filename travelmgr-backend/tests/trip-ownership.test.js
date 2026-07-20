const { test, describe } = require('node:test')
const assert = require('node:assert')
const { parseUserId } = require('../utils/trip-ownership')

describe('trip-ownership helpers', () => {
  test('parseUserId accepts numeric strings and rejects invalid values', () => {
    assert.strictEqual(parseUserId('12'), 12)
    assert.strictEqual(parseUserId(12), 12)
    assert.strictEqual(parseUserId(['7']), 7)
    assert.strictEqual(parseUserId(''), null)
    assert.strictEqual(parseUserId(undefined), null)
    assert.strictEqual(parseUserId('abc'), null)
    assert.strictEqual(parseUserId('0'), null)
  })
})
