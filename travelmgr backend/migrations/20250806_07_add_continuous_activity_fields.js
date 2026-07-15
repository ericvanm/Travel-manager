const { DataTypes } = require('sequelize')
const { addColumnIfNotExists, removeColumnIfExists } = require('../utils/migration-helpers')

module.exports = {
  up: async ({ context: queryInterface }) => {
    await addColumnIfNotExists(queryInterface, 'activities', 'group_id', {
      type: DataTypes.UUID,
      allowNull: true
    })

    await addColumnIfNotExists(queryInterface, 'activities', 'is_group_master', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    })

    await addColumnIfNotExists(queryInterface, 'activities', 'check_in_time', {
      type: DataTypes.TIME,
      allowNull: true
    })

    await addColumnIfNotExists(queryInterface, 'activities', 'check_out_time', {
      type: DataTypes.TIME,
      allowNull: true
    })
  },

  down: async ({ context: queryInterface }) => {
    await removeColumnIfExists(queryInterface, 'activities', 'group_id')
    await removeColumnIfExists(queryInterface, 'activities', 'is_group_master')
    await removeColumnIfExists(queryInterface, 'activities', 'check_in_time')
    await removeColumnIfExists(queryInterface, 'activities', 'check_out_time')
  }
}
