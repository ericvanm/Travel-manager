const { DataTypes } = require('sequelize')

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.addColumn('activities', 'group_id', {
      type: DataTypes.UUID,
      allowNull: true
    })
    
    await queryInterface.addColumn('activities', 'is_group_master', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    })
    
    await queryInterface.addColumn('activities', 'check_in_time', {
      type: DataTypes.TIME,
      allowNull: true
    })
    
    await queryInterface.addColumn('activities', 'check_out_time', {
      type: DataTypes.TIME,
      allowNull: true
    })
  },
  
  down: async ({ context: queryInterface }) => {
    await queryInterface.removeColumn('activities', 'group_id')
    await queryInterface.removeColumn('activities', 'is_group_master')
    await queryInterface.removeColumn('activities', 'check_in_time')
    await queryInterface.removeColumn('activities', 'check_out_time')
  }
}