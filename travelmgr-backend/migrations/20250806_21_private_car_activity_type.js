const { DataTypes } = require('sequelize')
const { tableExists } = require('../utils/migration-helpers')

const seedRows = async (queryInterface, table, rows) => {
  if (!(await tableExists(queryInterface, table))) return

  const ids = rows.map((row) => row.id)
  const existing = await queryInterface.sequelize.query(
    `SELECT id FROM ${table} WHERE id IN (${ids.join(', ')})`,
    { type: queryInterface.sequelize.QueryTypes.SELECT }
  )
  const existingIds = new Set(existing.map((row) => row.id))
  const missing = rows.filter((row) => !existingIds.has(row.id))
  if (missing.length > 0) {
    await queryInterface.bulkInsert(table, missing)
  }
}

module.exports = {
  up: async ({ context: queryInterface }) => {
    await seedRows(queryInterface, 'activity_types', [
      { id: 12, label: 'Personal Car', created_at: new Date(), updated_at: new Date() }
    ])
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.bulkDelete('activity_types', { id: [12] }, {})
  }
}
