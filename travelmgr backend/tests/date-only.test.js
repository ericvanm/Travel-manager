const { test, describe } = require('node:test')
const assert = require('node:assert')
const { deriveTripDateBounds, compareDateOnly } = require('../utils/date-only')

describe('date-only', () => {
  test('deriveTripDateBounds picks earliest start and latest end', () => {
    const bounds = deriveTripDateBounds(
      { startDate: '2026-06-15', endDate: '2026-06-10' },
      [
        { startDate: '2026-06-01', endDate: '2026-06-05' },
        { startDate: '2026-06-20', endDate: '2026-06-25' }
      ],
      []
    )
    assert.deepStrictEqual(bounds, { start: '2026-06-01', end: '2026-06-25' })
  })

  test('compareDateOnly orders ISO dates', () => {
    assert.strictEqual(compareDateOnly('2026-01-02', '2026-01-10'), -1)
    assert.strictEqual(compareDateOnly('2026-01-10', '2026-01-02'), 1)
    assert.strictEqual(compareDateOnly('2026-01-10', '2026-01-10'), 0)
  })
})
