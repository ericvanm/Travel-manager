const { DataTypes } = require('sequelize')
const { createTableIfNotExists, addIndexIfNotExists } = require('../utils/migration-helpers')

module.exports = {
  up: async ({ context: queryInterface }) => {
    await createTableIfNotExists(queryInterface, 'trip_planning_sessions', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL'
      },
      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'draft'
      },
      form_data: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      synthesis: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      itinerary: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      revision_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      revision_feedback: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      trip_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'trips', key: 'id' },
        onDelete: 'SET NULL'
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false
      }
    })

    await addIndexIfNotExists(queryInterface, 'trip_planning_sessions', ['user_id'])
    await addIndexIfNotExists(queryInterface, 'trip_planning_sessions', ['status'])
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.dropTable('trip_planning_sessions')
  }
}
