const bcrypt = require('bcryptjs')
const { DataTypes } = require('sequelize')
const { addColumnIfNotExists, removeColumnIfExists } = require('../utils/migration-helpers')

const DEMO_USERNAME = 'demo'
const DEV_DEFAULT_DEMO_PASSWORD = 'DemoUser1!'

/**
 * Resolve demo password:
 * - Explicit DEMO_USER_PASSWORD always wins
 * - Production without DEMO_USER_PASSWORD: skip seed (no hardcoded public default)
 * - Non-production: fall back to DEV_DEFAULT_DEMO_PASSWORD for local DX
 */
const resolveDemoPassword = () => {
  if (process.env.DEMO_USER_PASSWORD) {
    return String(process.env.DEMO_USER_PASSWORD)
  }
  if (process.env.NODE_ENV === 'production') {
    return null
  }
  return DEV_DEFAULT_DEMO_PASSWORD
}

module.exports = {
  up: async ({ context: queryInterface }) => {
    await addColumnIfNotExists(queryInterface, 'users', 'read_only', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    })

    await addColumnIfNotExists(queryInterface, 'users', 'allow_password_reset', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    })

    const existingDemo = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE username = :username LIMIT 1`,
      {
        replacements: { username: DEMO_USERNAME },
        type: queryInterface.sequelize.QueryTypes.SELECT
      }
    )

    if (existingDemo.length === 0) {
      const plainPassword = resolveDemoPassword()
      if (!plainPassword) {
        console.warn(
          '[migration] Skipping demo user seed in production: set DEMO_USER_PASSWORD to create the account.'
        )
        return
      }
      const passwordHash = await bcrypt.hash(plainPassword, 10)
      await queryInterface.bulkInsert('users', [{
        username: DEMO_USERNAME,
        name: 'demo user',
        first_name: 'user',
        last_name: 'demo',
        email: null,
        password_hash: passwordHash,
        role: 'user',
        read_only: true,
        allow_password_reset: false,
        must_set_password: false,
        disabled: false,
        language: 'en',
        created_at: new Date(),
        updated_at: new Date()
      }])
    } else {
      await queryInterface.sequelize.query(
        `UPDATE users SET read_only = true, allow_password_reset = false,
         first_name = COALESCE(first_name, 'user'), last_name = COALESCE(last_name, 'demo'),
         name = COALESCE(NULLIF(name, ''), 'demo user')
         WHERE username = :username`,
        { replacements: { username: DEMO_USERNAME } }
      )
    }
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.sequelize.query(
      `DELETE FROM users WHERE username = :username`,
      { replacements: { username: DEMO_USERNAME } }
    )
    await removeColumnIfExists(queryInterface, 'users', 'allow_password_reset')
    await removeColumnIfExists(queryInterface, 'users', 'read_only')
  }
}
