const { DataTypes } = require('sequelize')
const {
  addColumnIfNotExists,
  removeColumnIfExists,
  createTableIfNotExists,
  addIndexIfNotExists
} = require('../utils/migration-helpers')

module.exports = {
  up: async ({ context: queryInterface }) => {
    await addColumnIfNotExists(queryInterface, 'users', 'role', {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'user'
    })

    await addColumnIfNotExists(queryInterface, 'users', 'must_set_password', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    })

    const userTable = await queryInterface.describeTable('users')
    if (userTable.password_hash && userTable.password_hash.allowNull === false) {
      await queryInterface.changeColumn('users', 'password_hash', {
        type: DataTypes.STRING,
        allowNull: true
      })
    }

    await createTableIfNotExists(queryInterface, 'ai_interaction_logs', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      feature: {
        type: DataTypes.STRING(30),
        allowNull: false
      },
      operation: {
        type: DataTypes.STRING(40),
        allowNull: false
      },
      session_type: {
        type: DataTypes.STRING(30),
        allowNull: true
      },
      session_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      trip_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'trips', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      model: {
        type: DataTypes.STRING(80),
        allowNull: true
      },
      system_prompt: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      user_prompt: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      request_messages: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      request_payload: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      raw_response: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      parsed_response: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      token_usage: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'success'
      },
      error_message: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    })

    await addIndexIfNotExists(queryInterface, 'ai_interaction_logs', ['user_id'], {
      name: 'ai_interaction_logs_user_id_idx'
    })
    await addIndexIfNotExists(queryInterface, 'ai_interaction_logs', ['trip_id'], {
      name: 'ai_interaction_logs_trip_id_idx'
    })
    await addIndexIfNotExists(queryInterface, 'ai_interaction_logs', ['session_type', 'session_id'], {
      name: 'ai_interaction_logs_session_idx'
    })
    await addIndexIfNotExists(queryInterface, 'ai_interaction_logs', ['created_at'], {
      name: 'ai_interaction_logs_created_at_idx'
    })

    const existingAdmin = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE username = 'admin' LIMIT 1",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    )

    if (existingAdmin.length === 0) {
      await queryInterface.bulkInsert('users', [{
        username: 'admin',
        name: 'Administrator',
        password_hash: null,
        role: 'admin',
        must_set_password: true,
        disabled: false,
        language: 'fr',
        created_at: new Date(),
        updated_at: new Date()
      }])
    }
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.dropTable('ai_interaction_logs')
    await removeColumnIfExists(queryInterface, 'users', 'must_set_password')
    await removeColumnIfExists(queryInterface, 'users', 'role')
    await queryInterface.sequelize.query("DELETE FROM users WHERE username = 'admin' AND password_hash IS NULL")
    await queryInterface.changeColumn('users', 'password_hash', {
      type: DataTypes.STRING,
      allowNull: false
    })
  }
}
