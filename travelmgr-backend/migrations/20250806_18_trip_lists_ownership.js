const { removeColumnIfExists, addIndexIfNotExists } = require('../utils/migration-helpers')

module.exports = {
  up: async ({ context: queryInterface }) => {
    const tableInfo = await queryInterface.describeTable('trips')
    if (tableInfo.owner_user_id) {
      await queryInterface.sequelize.query(`
        INSERT INTO trip_lists (user_id, trip_id)
        SELECT owner_user_id, id
        FROM trips
        WHERE owner_user_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM trip_lists tl
            WHERE tl.user_id = trips.owner_user_id AND tl.trip_id = trips.id
          )
      `)
      await removeColumnIfExists(queryInterface, 'trips', 'owner_user_id')
    }

    await addIndexIfNotExists(
      queryInterface,
      'trip_lists',
      ['user_id', 'trip_id'],
      { unique: true, name: 'trip_lists_user_trip_unique' }
    )
  },

  down: async ({ context: queryInterface }) => {
    const { DataTypes } = require('sequelize')
    const tableInfo = await queryInterface.describeTable('trips')
    if (!tableInfo.owner_user_id) {
      await queryInterface.addColumn('trips', 'owner_user_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      })
    }

    try {
      await queryInterface.removeIndex('trip_lists', 'trip_lists_user_trip_unique')
    } catch (error) {
      if (!String(error.message).includes('does not exist')) {
        throw error
      }
    }
  }
}
