const { DataTypes } = require('sequelize')
const { addColumnIfNotExists, removeColumnIfExists } = require('../utils/migration-helpers')

const flightColumns = [
  ['airline', { type: DataTypes.STRING(50), allowNull: true }],
  ['flight_number', { type: DataTypes.STRING(20), allowNull: true }],
  ['departure_airport', { type: DataTypes.STRING(10), allowNull: true }],
  ['arrival_airport', { type: DataTypes.STRING(10), allowNull: true }],
  ['seat', { type: DataTypes.STRING(10), allowNull: true }],
  ['confirmation_code', { type: DataTypes.STRING(50), allowNull: true }],
  ['gate', { type: DataTypes.STRING(10), allowNull: true }],
  ['terminal', { type: DataTypes.STRING(10), allowNull: true }],
  ['company', { type: DataTypes.STRING(100), allowNull: true }],
  ['pickup_location', { type: DataTypes.STRING(255), allowNull: true }],
  ['dropoff_location', { type: DataTypes.STRING(255), allowNull: true }],
  ['pickup_date', { type: DataTypes.DATE, allowNull: true }],
  ['dropoff_date', { type: DataTypes.DATE, allowNull: true }],
  ['car_type', { type: DataTypes.STRING(100), allowNull: true }]
]

module.exports = {
  up: async ({ context: queryInterface }) => {
    for (const [column, definition] of flightColumns) {
      await addColumnIfNotExists(queryInterface, 'activities', column, definition)
    }
  },

  down: async ({ context: queryInterface }) => {
    for (const [column] of flightColumns) {
      await removeColumnIfExists(queryInterface, 'activities', column)
    }
  }
}
