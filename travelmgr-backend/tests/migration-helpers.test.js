const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const {
  addColumnIfNotExists,
  tableExists
} = require('../utils/migration-helpers')

describe('migration-helpers', () => {
  it('addColumnIfNotExists skips existing columns', async () => {
    const calls = []
    const queryInterface = {
      describeTable: async () => ({ address: { type: 'TEXT' } }),
      addColumn: async (...args) => { calls.push(args) }
    }

    await addColumnIfNotExists(queryInterface, 'activities', 'address', { type: 'TEXT' })
    assert.equal(calls.length, 0)
  })

  it('addColumnIfNotExists adds missing columns', async () => {
    const calls = []
    const queryInterface = {
      describeTable: async () => ({}),
      addColumn: async (...args) => { calls.push(args) }
    }

    await addColumnIfNotExists(queryInterface, 'activities', 'address', { type: 'TEXT' })
    assert.equal(calls.length, 1)
    assert.equal(calls[0][1], 'address')
  })

  it('tableExists checks table names', async () => {
    const queryInterface = {
      showAllTables: async () => ['trips', 'activities']
    }

    assert.equal(await tableExists(queryInterface, 'trips'), true)
    assert.equal(await tableExists(queryInterface, 'missing'), false)
  })
})
