const { DataTypes } = require('sequelize')

module.exports = {
  up: async ({ context: queryInterface }) => {
    const tableInfo = await queryInterface.describeTable('users')
    
    if (!tableInfo.first_name) {
      await queryInterface.addColumn('users', 'first_name', {
        type: DataTypes.STRING,
        allowNull: true
      })
    }
    
    if (!tableInfo.last_name) {
      await queryInterface.addColumn('users', 'last_name', {
        type: DataTypes.STRING,
        allowNull: true
      })
    }
    
    if (!tableInfo.language) {
      await queryInterface.addColumn('users', 'language', {
        type: DataTypes.STRING(5),
        allowNull: true,
        defaultValue: 'en'
      })
    }
  },

  down: async ({ context: queryInterface }) => {
    const tableInfo = await queryInterface.describeTable('users')
    
    if (tableInfo.first_name) {
      await queryInterface.removeColumn('users', 'first_name')
    }
    if (tableInfo.last_name) {
      await queryInterface.removeColumn('users', 'last_name')
    }
    if (tableInfo.language) {
      await queryInterface.removeColumn('users', 'language')
    }
  }
}