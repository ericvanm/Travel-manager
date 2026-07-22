const bcrypt = require('bcryptjs')
const { sequelize } = require('../utils/db')
const { User, Trip, TripList, Stage, Activity, Country } = require('../models/DBmodels')

const resetDatabase = async () => {
  await sequelize.query(`
    TRUNCATE TABLE
      ai_interaction_logs,
      trip_planning_sessions,
      trip_adaptation_sessions,
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

const getDefaultCountryId = async () => {
  const country = await Country.findOne({ where: { code: 'ZA' } })
    || await Country.findOne()
  if (!country) {
    throw new Error('No country found in database. Run migrations before tests.')
  }
  return country.id
}

const TEST_PASSWORD = 'secret1234'

const createUser = async ({ username = 'testuser', password = TEST_PASSWORD, name = 'Test User', disabled = false } = {}) => {
  const passwordHash = await bcrypt.hash(password, 10)
  return User.create({ username, passwordHash, name, disabled })
}

const createTrip = async ({ name = 'Test Trip', description = 'A test trip' } = {}) => {
  return Trip.create({ name, description })
}

const linkTripToUser = async (tripId, userId) => {
  return TripList.create({ tripId, userId })
}

const createTripForUser = async (userId, { name = 'Test Trip', description = 'A test trip' } = {}) => {
  const trip = await createTrip({ name, description })
  if (userId) {
    await linkTripToUser(trip.id, userId)
  }
  return trip
}

const createAuthenticatedAgent = async (app, { username = 'testuser', password = TEST_PASSWORD, name = 'Test User' } = {}) => {
  const supertest = require('supertest')
  const agent = supertest.agent(app)
  await agent.post('/api/auth/register').send({ username, password, name })
  await agent.post('/api/auth/login').send({ username, password })
  const user = await User.findOne({ where: { username } })
  return { agent, user }
}

const createStage = async (tripId, { name = 'Stage 1', startDate = '2025-06-01', endDate = '2025-06-05', countryId } = {}) => {
  const resolvedCountryId = countryId || await getDefaultCountryId()
  return Stage.create({
    tripId,
    name,
    startDate,
    endDate,
    countryId: resolvedCountryId
  })
}

const createActivity = async (stageId, {
  name = 'Activity',
  activityTypeId = 1,
  startDateTime = '2025-06-01T10:00:00Z',
  endDateTime = '2025-06-01T12:00:00Z'
} = {}) => {
  return Activity.create({ stageId, name, activityTypeId, startDateTime, endDateTime })
}

module.exports = {
  resetDatabase,
  getDefaultCountryId,
  createUser,
  createTrip,
  linkTripToUser,
  createTripForUser,
  createAuthenticatedAgent,
  createStage,
  createActivity,
  TEST_PASSWORD
}
