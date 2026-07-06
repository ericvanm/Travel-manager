const { DataTypes } = require('sequelize')

module.exports = {
  up: async ({ context: queryInterface }) => {
    // Add new hotel-specific fields
    await queryInterface.addColumn('activities', 'address', {
      type: DataTypes.TEXT,
      allowNull: true
    })
    
    await queryInterface.addColumn('activities', 'phone', {
      type: DataTypes.STRING,
      allowNull: true
    })
    
    await queryInterface.addColumn('activities', 'check_in_date', {
      type: DataTypes.DATE,
      allowNull: true
    })
    
    await queryInterface.addColumn('activities', 'check_out_date', {
      type: DataTypes.DATE,
      allowNull: true
    })
    
    await queryInterface.addColumn('activities', 'confirmation_number', {
      type: DataTypes.STRING,
      allowNull: true
    })
    
    await queryInterface.addColumn('activities', 'room_type', {
      type: DataTypes.STRING,
      allowNull: true
    })
    
    // Remove old address_line column if it exists
    try {
      await queryInterface.removeColumn('activities', 'address_line')
    } catch (error) {
      console.log('address_line column does not exist, skipping removal')
    }
  },

  down: async ({ context: queryInterface }) => {
    // Remove the new columns
    await queryInterface.removeColumn('activities', 'address')
    await queryInterface.removeColumn('activities', 'phone')
    await queryInterface.removeColumn('activities', 'check_in_date')
    await queryInterface.removeColumn('activities', 'check_out_date')
    await queryInterface.removeColumn('activities', 'confirmation_number')
    await queryInterface.removeColumn('activities', 'room_type')
    
    // Re-add address_line column
    await queryInterface.addColumn('activities', 'address_line', {
      type: DataTypes.TEXT,
      allowNull: true
    })
  }
}