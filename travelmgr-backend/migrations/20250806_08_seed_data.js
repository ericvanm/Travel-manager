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
    await seedRows(queryInterface, 'languages', [
      { id: 1, code: 'en', name: 'English', created_at: new Date(), updated_at: new Date() },
      { id: 2, code: 'fr', name: 'Français', created_at: new Date(), updated_at: new Date() },
      { id: 3, code: 'nl', name: 'Nederlands', created_at: new Date(), updated_at: new Date() },
      { id: 4, code: 'es', name: 'Español', created_at: new Date(), updated_at: new Date() }
    ])

    await seedRows(queryInterface, 'activity_types', [
      { id: 1, label: 'Restaurant', created_at: new Date(), updated_at: new Date() },
      { id: 2, label: 'Museum', created_at: new Date(), updated_at: new Date() },
      { id: 3, label: 'Tour', created_at: new Date(), updated_at: new Date() },
      { id: 4, label: 'Shopping', created_at: new Date(), updated_at: new Date() },
      { id: 5, label: 'Entertainment', created_at: new Date(), updated_at: new Date() }
    ])
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.bulkDelete('activity_types', null, {})
    await queryInterface.bulkDelete('languages', null, {})
  }
}
