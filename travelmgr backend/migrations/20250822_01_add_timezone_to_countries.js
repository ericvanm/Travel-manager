const { DataTypes } = require('sequelize')

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.addColumn('countries', 'timezone', {
      type: DataTypes.STRING(50),
      allowNull: true
    })

    // Update existing countries with their timezones
    await queryInterface.bulkUpdate('countries', 
      { timezone: 'Africa/Johannesburg' }, 
      { code: 'ZA' }
    )
    await queryInterface.bulkUpdate('countries', 
      { timezone: 'Europe/Brussels' }, 
      { code: 'BE' }
    )
    await queryInterface.bulkUpdate('countries', 
      { timezone: 'Europe/Amsterdam' }, 
      { code: 'NL' }
    )
    await queryInterface.bulkUpdate('countries', 
      { timezone: 'Africa/Mbabane' }, 
      { code: 'SZ' }
    )
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.removeColumn('countries', 'timezone')
  }
}