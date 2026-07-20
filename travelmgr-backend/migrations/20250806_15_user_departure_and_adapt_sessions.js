const { DataTypes } = require('sequelize')
const { addColumnIfNotExists, removeColumnIfExists, createTableIfNotExists } = require('../utils/migration-helpers')

module.exports = {
  up: async ({ context: queryInterface }) => {
    await addColumnIfNotExists(queryInterface, 'users', 'default_departure_location', {
      type: DataTypes.STRING(255),
      allowNull: true
    })

    await createTableIfNotExists(queryInterface, 'trip_adaptation_sessions', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' }
      },
      trip_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'trips', key: 'id' }
      },
      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'draft'
      },
      trip_snapshot: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      synthesis: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      adaptation_request: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      proposed_changes: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      reserved_impacts: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: []
      },
      language: {
        type: DataTypes.STRING(5),
        allowNull: true,
        defaultValue: 'fr'
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    })
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.dropTable('trip_adaptation_sessions')
    await removeColumnIfExists(queryInterface, 'users', 'default_departure_location')
  }
}
