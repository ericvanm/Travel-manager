const { DataTypes } = require('sequelize')

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.addColumn('activities', 'airline', {
      type: DataTypes.STRING(50),
      allowNull: true
    })
    
    await queryInterface.addColumn('activities', 'flight_number', {
      type: DataTypes.STRING(20),
      allowNull: true
    })
    
    await queryInterface.addColumn('activities', 'departure_airport', {
      type: DataTypes.STRING(10),
      allowNull: true
    })
    
    await queryInterface.addColumn('activities', 'arrival_airport', {
      type: DataTypes.STRING(10),
      allowNull: true
    })
    
    await queryInterface.addColumn('activities', 'seat', {
      type: DataTypes.STRING(10),
      allowNull: true
    })
    
    await queryInterface.addColumn('activities', 'confirmation_code', {
      type: DataTypes.STRING(50),
      allowNull: true
    })
    
    await queryInterface.addColumn('activities', 'gate', {
      type: DataTypes.STRING(10),
      allowNull: true
    })
    
    await queryInterface.addColumn('activities', 'terminal', {
      type: DataTypes.STRING(10),
      allowNull: true
    })
    
    await queryInterface.addColumn('activities', 'company', {
      type: DataTypes.STRING(100),
      allowNull: true
    })
    
    await queryInterface.addColumn('activities', 'pickup_location', {
      type: DataTypes.STRING(255),
      allowNull: true
    })
    
    await queryInterface.addColumn('activities', 'dropoff_location', {
      type: DataTypes.STRING(255),
      allowNull: true
    })
    
    await queryInterface.addColumn('activities', 'pickup_date', {
      type: DataTypes.DATE,
      allowNull: true
    })
    
    await queryInterface.addColumn('activities', 'dropoff_date', {
      type: DataTypes.DATE,
      allowNull: true
    })
    
    await queryInterface.addColumn('activities', 'car_type', {
      type: DataTypes.STRING(100),
      allowNull: true
    })
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.removeColumn('activities', 'airline')
    await queryInterface.removeColumn('activities', 'flight_number')
    await queryInterface.removeColumn('activities', 'departure_airport')
    await queryInterface.removeColumn('activities', 'arrival_airport')
    await queryInterface.removeColumn('activities', 'seat')
    await queryInterface.removeColumn('activities', 'confirmation_code')
    await queryInterface.removeColumn('activities', 'gate')
    await queryInterface.removeColumn('activities', 'terminal')
    await queryInterface.removeColumn('activities', 'company')
    await queryInterface.removeColumn('activities', 'pickup_location')
    await queryInterface.removeColumn('activities', 'dropoff_location')
    await queryInterface.removeColumn('activities', 'pickup_date')
    await queryInterface.removeColumn('activities', 'dropoff_date')
    await queryInterface.removeColumn('activities', 'car_type')
  }
}