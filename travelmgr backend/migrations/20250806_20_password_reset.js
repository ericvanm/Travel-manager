const { DataTypes } = require('sequelize')
const { addColumnIfNotExists, removeColumnIfExists } = require('../utils/migration-helpers')

module.exports = {
  up: async ({ context: queryInterface }) => {
    await addColumnIfNotExists(queryInterface, 'users', 'password_reset_token_hash', {
      type: DataTypes.STRING(128),
      allowNull: true
    })

    await addColumnIfNotExists(queryInterface, 'users', 'password_reset_expires_at', {
      type: DataTypes.DATE,
      allowNull: true
    })
  },

  down: async ({ context: queryInterface }) => {
    await removeColumnIfExists(queryInterface, 'users', 'password_reset_expires_at')
    await removeColumnIfExists(queryInterface, 'users', 'password_reset_token_hash')
  }
}
