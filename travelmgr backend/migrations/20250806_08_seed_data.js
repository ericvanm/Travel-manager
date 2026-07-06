const { DataTypes } = require('sequelize')

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.bulkInsert('languages', [
      { id: 1, code: 'en', name: 'English', created_at: new Date(), updated_at: new Date() },
      { id: 2, code: 'fr', name: 'Français', created_at: new Date(), updated_at: new Date() },
      { id: 3, code: 'nl', name: 'Nederlands', created_at: new Date(), updated_at: new Date() },
      { id: 4, code: 'es', name: 'Español', created_at: new Date(), updated_at: new Date() }
    ])

    await queryInterface.bulkInsert('activity_types', [
      { id: 1, label: 'Restaurant', created_at: new Date(), updated_at: new Date() },
      { id: 2, label: 'Museum', created_at: new Date(), updated_at: new Date() },
      { id: 3, label: 'Tour', created_at: new Date(), updated_at: new Date() },
      { id: 4, label: 'Shopping', created_at: new Date(), updated_at: new Date() },
      { id: 5, label: 'Entertainment', created_at: new Date(), updated_at: new Date() }
    ])
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.bulkDelete('activity_types', null, {})
    await queryInterface.bulkDelete('languages', null, {})
  }
}