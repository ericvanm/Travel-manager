const { DataTypes } = require('sequelize')

module.exports = {
  up: async ({ context: queryInterface }) => {
    // Languages table
    await queryInterface.createTable('languages', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      code: {
        type: DataTypes.STRING(5),
        unique: true,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    })

    // Countries table
    await queryInterface.createTable('countries', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      code: {
        type: DataTypes.STRING(3),
        unique: true,
        allowNull: false
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    })

    // Users table
    await queryInterface.createTable('users', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      username: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      password_hash: {
        type: DataTypes.STRING,
        allowNull: false
      },
      disabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      preferred_language_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'languages', key: 'id' }
      },
      email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    })

    // Trips table
    await queryInterface.createTable('trips', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      start_date: {
        type: DataTypes.DATE,
        allowNull: true
      },
      end_date: {
        type: DataTypes.DATE,
        allowNull: true
      },
      budget: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    })

    // Stages table
    await queryInterface.createTable('stages', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      trip_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'trips', key: 'id' }
      },
      country_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'countries', key: 'id' }
      },
      name: {
        type: DataTypes.STRING,
        allowNull: true
      },
      start_date: {
        type: DataTypes.DATE,
        allowNull: true
      },
      end_date: {
        type: DataTypes.DATE,
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    })

    // Activity Types table
    await queryInterface.createTable('activity_types', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      label: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    })

    // Activities table
    await queryInterface.createTable('activities', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      stage_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'stages', key: 'id' }
      },
      activity_type_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'activity_types', key: 'id' }
      },
      name: {
        type: DataTypes.STRING,
        allowNull: true
      },
      booking_code: {
        type: DataTypes.STRING,
        allowNull: true
      },
      start_date_time: {
        type: DataTypes.DATE,
        allowNull: true
      },
      end_date_time: {
        type: DataTypes.DATE,
        allowNull: true
      },
      address_line: {
        type: DataTypes.STRING,
        allowNull: true
      },
      postal_code: {
        type: DataTypes.STRING,
        allowNull: true
      },
      city: {
        type: DataTypes.STRING,
        allowNull: true
      },
      country: {
        type: DataTypes.STRING,
        allowNull: true
      },
      comments: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      cost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    })

    // Transport Types table
    await queryInterface.createTable('transport_types', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      label: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    })

    // Transports table
    await queryInterface.createTable('transports', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      stage_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'stages', key: 'id' }
      },
      transport_type_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'transport_types', key: 'id' }
      },
      departure_location: {
        type: DataTypes.STRING,
        allowNull: true
      },
      arrival_location: {
        type: DataTypes.STRING,
        allowNull: true
      },
      departure_date_time: {
        type: DataTypes.DATE,
        allowNull: true
      },
      arrival_date_time: {
        type: DataTypes.DATE,
        allowNull: true
      },
      booking_reference: {
        type: DataTypes.STRING,
        allowNull: true
      },
      cost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    })

    // Accommodation Types table
    await queryInterface.createTable('accommodation_types', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      label: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    })

    // Accommodations table
    await queryInterface.createTable('accommodations', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      stage_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'stages', key: 'id' }
      },
      accommodation_type_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'accommodation_types', key: 'id' }
      },
      name: {
        type: DataTypes.STRING,
        allowNull: true
      },
      address_line: {
        type: DataTypes.STRING,
        allowNull: true
      },
      city: {
        type: DataTypes.STRING,
        allowNull: true
      },
      check_in_date: {
        type: DataTypes.DATE,
        allowNull: true
      },
      check_out_date: {
        type: DataTypes.DATE,
        allowNull: true
      },
      booking_reference: {
        type: DataTypes.STRING,
        allowNull: true
      },
      cost_per_night: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      total_cost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    })

    // Expense Categories table
    await queryInterface.createTable('expense_categories', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      label: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    })

    // Expenses table
    await queryInterface.createTable('expenses', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      trip_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'trips', key: 'id' }
      },
      expense_category_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'expense_categories', key: 'id' }
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false
      },
      expense_date: {
        type: DataTypes.DATE,
        allowNull: false
      },
      receipt_url: {
        type: DataTypes.STRING,
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    })

    // Notification Types table
    await queryInterface.createTable('notification_types', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      label: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    })

    // Notifications table
    await queryInterface.createTable('notifications', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' }
      },
      notification_type_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'notification_types', key: 'id' }
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      is_read: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      scheduled_for: {
        type: DataTypes.DATE,
        allowNull: true
      },
      sent_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    })

    // Trip Lists table
    await queryInterface.createTable('trip_lists', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' }
      },
      trip_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'trips', key: 'id' }
      }
    })

    // Translations table
    await queryInterface.createTable('translations', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      language_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'languages', key: 'id' }
      },
      entity_type: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      entity_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      field_name: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      translated_text: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    })
  },
  down: async ({ context: queryInterface }) => {
    await queryInterface.dropTable('translations')
    await queryInterface.dropTable('trip_lists')
    await queryInterface.dropTable('notifications')
    await queryInterface.dropTable('notification_types')
    await queryInterface.dropTable('expenses')
    await queryInterface.dropTable('expense_categories')
    await queryInterface.dropTable('accommodations')
    await queryInterface.dropTable('accommodation_types')
    await queryInterface.dropTable('transports')
    await queryInterface.dropTable('transport_types')
    await queryInterface.dropTable('activities')
    await queryInterface.dropTable('activity_types')
    await queryInterface.dropTable('stages')
    await queryInterface.dropTable('trips')
    await queryInterface.dropTable('users')
    await queryInterface.dropTable('countries')
    await queryInterface.dropTable('languages')
  },
}