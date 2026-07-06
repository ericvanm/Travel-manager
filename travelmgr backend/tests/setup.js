const bcrypt = require('bcryptjs')
const { sequelize } = require('../utils/db')
const { User, Trip } = require('../models/DBmodels')

const resetDatabase = async () => {
  await sequelize.query(`
    TRUNCATE TABLE
      activities,
      transports,
      accommodations,
      expenses,
      notifications,
      stages,
      trip_lists,
      trips,
      users
    RESTART IDENTITY CASCADE
  `)
}

const createUser = async ({ username = 'testuser', password = 'secret', name = 'Test User' } = {}) => {
  const passwordHash = await bcrypt.hash(password, 10)
  return User.create({ username, passwordHash, name })
}

const createTrip = async ({ name = 'Test Trip', description = 'A test trip' } = {}) => {
  return Trip.create({ name, description })
}

module.exports = {
  resetDatabase,
  createUser,
  createTrip,
}
