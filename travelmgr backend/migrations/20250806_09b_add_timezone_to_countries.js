const { DataTypes } = require('sequelize')
const { addColumnIfNotExists, removeColumnIfExists } = require('../utils/migration-helpers')

module.exports = {
  up: async ({ context: queryInterface }) => {
    await addColumnIfNotExists(queryInterface, 'countries', 'timezone', {
      type: DataTypes.STRING(50),
      allowNull: true
    })

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
    await removeColumnIfExists(queryInterface, 'countries', 'timezone')
  }
}
