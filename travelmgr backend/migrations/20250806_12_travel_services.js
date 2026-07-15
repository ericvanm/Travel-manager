const { DataTypes } = require('sequelize')
const { Op } = require('sequelize')
const { createTableIfNotExists, tableExists } = require('../utils/migration-helpers')

const flightsSchema = {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  stage_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'stages', key: 'id' },
    onDelete: 'CASCADE'
  },
  airline: { type: DataTypes.STRING(50), allowNull: true },
  flight_number: { type: DataTypes.STRING(20), allowNull: true },
  departure_airport: { type: DataTypes.STRING(10), allowNull: true },
  arrival_airport: { type: DataTypes.STRING(10), allowNull: true },
  departure_time: { type: DataTypes.DATE, allowNull: true },
  arrival_time: { type: DataTypes.DATE, allowNull: true },
  seat: { type: DataTypes.STRING(10), allowNull: true },
  confirmation_code: { type: DataTypes.STRING(50), allowNull: true },
  gate: { type: DataTypes.STRING(10), allowNull: true },
  terminal: { type: DataTypes.STRING(10), allowNull: true },
  cost: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  created_at: { type: DataTypes.DATE, allowNull: false },
  updated_at: { type: DataTypes.DATE, allowNull: false }
}

const lodgingSchema = {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  stage_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'stages', key: 'id' },
    onDelete: 'CASCADE'
  },
  name: { type: DataTypes.STRING(255), allowNull: true },
  address: { type: DataTypes.TEXT, allowNull: true },
  phone: { type: DataTypes.STRING(50), allowNull: true },
  check_in_date: { type: DataTypes.DATE, allowNull: true },
  check_out_date: { type: DataTypes.DATE, allowNull: true },
  confirmation_number: { type: DataTypes.STRING(100), allowNull: true },
  room_type: { type: DataTypes.STRING(100), allowNull: true },
  total_cost: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  created_at: { type: DataTypes.DATE, allowNull: false },
  updated_at: { type: DataTypes.DATE, allowNull: false }
}

const carRentalsSchema = {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  stage_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'stages', key: 'id' },
    onDelete: 'CASCADE'
  },
  company: { type: DataTypes.STRING(100), allowNull: true },
  pickup_location: { type: DataTypes.STRING(255), allowNull: true },
  dropoff_location: { type: DataTypes.STRING(255), allowNull: true },
  pickup_date: { type: DataTypes.DATE, allowNull: true },
  dropoff_date: { type: DataTypes.DATE, allowNull: true },
  car_type: { type: DataTypes.STRING(100), allowNull: true },
  confirmation_number: { type: DataTypes.STRING(100), allowNull: true },
  total_cost: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  created_at: { type: DataTypes.DATE, allowNull: false },
  updated_at: { type: DataTypes.DATE, allowNull: false }
}

module.exports = {
  up: async ({ context: queryInterface }) => {
    await createTableIfNotExists(queryInterface, 'flights', flightsSchema)
    await createTableIfNotExists(queryInterface, 'lodging', lodgingSchema)
    await createTableIfNotExists(queryInterface, 'car_rentals', carRentalsSchema)

    const activityTypes = [
      { id: 6, label: 'Flight', created_at: new Date(), updated_at: new Date() },
      { id: 7, label: 'Hotel', created_at: new Date(), updated_at: new Date() },
      { id: 8, label: 'Car Rental', created_at: new Date(), updated_at: new Date() }
    ]

    if (await tableExists(queryInterface, 'activity_types')) {
      const existing = await queryInterface.sequelize.query(
        'SELECT id FROM activity_types WHERE id IN (6, 7, 8)',
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      )
      const existingIds = new Set(existing.map((row) => row.id))
      const missing = activityTypes.filter((row) => !existingIds.has(row.id))
      if (missing.length > 0) {
        await queryInterface.bulkInsert('activity_types', missing)
      }
    }
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.dropTable('car_rentals')
    await queryInterface.dropTable('lodging')
    await queryInterface.dropTable('flights')
    await queryInterface.bulkDelete('activity_types', { id: { [Op.in]: [6, 7, 8] } }, {})
  }
}
