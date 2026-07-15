const { DataTypes } = require('sequelize')
const { addColumnIfNotExists, removeColumnIfExists } = require('../utils/migration-helpers')

module.exports = {
  up: async ({ context: queryInterface }) => {
    await addColumnIfNotExists(queryInterface, 'activities', 'address', {
      type: DataTypes.TEXT,
      allowNull: true
    })

    await addColumnIfNotExists(queryInterface, 'activities', 'phone', {
      type: DataTypes.STRING,
      allowNull: true
    })

    await addColumnIfNotExists(queryInterface, 'activities', 'check_in_date', {
      type: DataTypes.DATE,
      allowNull: true
    })

    await addColumnIfNotExists(queryInterface, 'activities', 'check_out_date', {
      type: DataTypes.DATE,
      allowNull: true
    })

    await addColumnIfNotExists(queryInterface, 'activities', 'confirmation_number', {
      type: DataTypes.STRING,
      allowNull: true
    })

    await addColumnIfNotExists(queryInterface, 'activities', 'room_type', {
      type: DataTypes.STRING,
      allowNull: true
    })

    await removeColumnIfExists(queryInterface, 'activities', 'address_line')
  },

  down: async ({ context: queryInterface }) => {
    await removeColumnIfExists(queryInterface, 'activities', 'address')
    await removeColumnIfExists(queryInterface, 'activities', 'phone')
    await removeColumnIfExists(queryInterface, 'activities', 'check_in_date')
    await removeColumnIfExists(queryInterface, 'activities', 'check_out_date')
    await removeColumnIfExists(queryInterface, 'activities', 'confirmation_number')
    await removeColumnIfExists(queryInterface, 'activities', 'room_type')

    await addColumnIfNotExists(queryInterface, 'activities', 'address_line', {
      type: DataTypes.TEXT,
      allowNull: true
    })
  }
}
