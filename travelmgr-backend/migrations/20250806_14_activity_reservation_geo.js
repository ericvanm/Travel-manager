const { DataTypes } = require('sequelize')
const { addColumnIfNotExists, removeColumnIfExists } = require('../utils/migration-helpers')

module.exports = {
  up: async ({ context: queryInterface }) => {
    await addColumnIfNotExists(queryInterface, 'activities', 'reservation_status', {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'to_reserve'
    })
    await addColumnIfNotExists(queryInterface, 'activities', 'booking_url', {
      type: DataTypes.TEXT,
      allowNull: true
    })
    await addColumnIfNotExists(queryInterface, 'activities', 'latitude', {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true
    })
    await addColumnIfNotExists(queryInterface, 'activities', 'longitude', {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true
    })
    await addColumnIfNotExists(queryInterface, 'activities', 'departure_location', {
      type: DataTypes.STRING(255),
      allowNull: true
    })
    await addColumnIfNotExists(queryInterface, 'activities', 'arrival_location', {
      type: DataTypes.STRING(255),
      allowNull: true
    })
    await addColumnIfNotExists(queryInterface, 'trips', 'departure_location', {
      type: DataTypes.STRING(255),
      allowNull: true
    })
  },

  down: async ({ context: queryInterface }) => {
    await removeColumnIfExists(queryInterface, 'trips', 'departure_location')
    await removeColumnIfExists(queryInterface, 'activities', 'arrival_location')
    await removeColumnIfExists(queryInterface, 'activities', 'departure_location')
    await removeColumnIfExists(queryInterface, 'activities', 'longitude')
    await removeColumnIfExists(queryInterface, 'activities', 'latitude')
    await removeColumnIfExists(queryInterface, 'activities', 'booking_url')
    await removeColumnIfExists(queryInterface, 'activities', 'reservation_status')
  }
}
