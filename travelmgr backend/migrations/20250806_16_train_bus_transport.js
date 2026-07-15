const { DataTypes } = require('sequelize')
const { addColumnIfNotExists, removeColumnIfExists, tableExists } = require('../utils/migration-helpers')

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
      { id: 9, label: 'Train', created_at: new Date(), updated_at: new Date() },
      { id: 10, label: 'Bus', created_at: new Date(), updated_at: new Date() },
      { id: 11, label: 'Public Transport', created_at: new Date(), updated_at: new Date() }
    ])

    await addColumnIfNotExists(queryInterface, 'activities', 'transport_line', {
      type: DataTypes.STRING(120),
      allowNull: true
    })
    await addColumnIfNotExists(queryInterface, 'activities', 'transport_changes', {
      type: DataTypes.INTEGER,
      allowNull: true
    })
  },

  down: async ({ context: queryInterface }) => {
    await removeColumnIfExists(queryInterface, 'activities', 'transport_changes')
    await removeColumnIfExists(queryInterface, 'activities', 'transport_line')
    await queryInterface.bulkDelete('activity_types', { id: [9, 10, 11] }, {})
  }
}
