const { Op, QueryTypes } = require('sequelize')
const { Trip, TripList } = require('../models/DBmodels')

const parseUserId = (value) => {
  if (value === undefined || value === null || value === '') {
    return null
  }

  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number.parseInt(String(raw), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const linkTripToUser = async (tripId, userId) => {
  const numericTripId = parseUserId(tripId)
  const numericUserId = parseUserId(userId)
  if (!numericTripId || !numericUserId) {
    return null
  }

  const [link] = await TripList.findOrCreate({
    where: { tripId: numericTripId, userId: numericUserId },
    defaults: { tripId: numericTripId, userId: numericUserId }
  })

  return link
}

const findTripIdsForUser = async (userId) => {
  const numericUserId = parseUserId(userId)
  if (!numericUserId) {
    return []
  }

  const rows = await TripList.sequelize.query(
    `SELECT DISTINCT trip_id AS "tripId"
     FROM (
       SELECT trip_id FROM trip_lists WHERE user_id = :userId
       UNION
       SELECT trip_id FROM trip_planning_sessions
         WHERE user_id = :userId AND trip_id IS NOT NULL
       UNION
       SELECT trip_id FROM trip_adaptation_sessions
         WHERE user_id = :userId
     ) AS owned_trips
     WHERE trip_id IS NOT NULL
     ORDER BY trip_id`,
    {
      replacements: { userId: numericUserId },
      type: QueryTypes.SELECT
    }
  )

  return rows
    .map((row) => Number(row.tripId))
    .filter((id) => Number.isFinite(id))
}

const findUsersByTripIds = async (tripIds) => {
  const numericTripIds = [...new Set(tripIds.map((id) => Number(id)).filter(Number.isFinite))]
  if (numericTripIds.length === 0) {
    return new Map()
  }

  const rows = await TripList.sequelize.query(
    `SELECT DISTINCT links.trip_id AS "tripId", u.id, u.username, u.name
     FROM (
       SELECT trip_id, user_id FROM trip_lists WHERE trip_id IN (:tripIds)
       UNION
       SELECT trip_id, user_id FROM trip_planning_sessions
         WHERE trip_id IN (:tripIds) AND user_id IS NOT NULL
       UNION
       SELECT trip_id, user_id FROM trip_adaptation_sessions
         WHERE trip_id IN (:tripIds) AND user_id IS NOT NULL
     ) AS links
     JOIN users u ON u.id = links.user_id
     ORDER BY links.trip_id, u.username`,
    {
      replacements: { tripIds: numericTripIds },
      type: QueryTypes.SELECT
    }
  )

  const usersByTripId = new Map()
  for (const row of rows) {
    const tripId = Number(row.tripId)
    const existing = usersByTripId.get(tripId) || []
    if (!existing.some((user) => user.id === row.id)) {
      existing.push({
        id: row.id,
        username: row.username,
        name: row.name
      })
    }
    usersByTripId.set(tripId, existing)
  }

  return usersByTripId
}

const findTripsForAdmin = async (userId = null) => {
  const numericUserId = parseUserId(userId)
  const where = {}

  if (numericUserId) {
    const tripIds = await findTripIdsForUser(numericUserId)
    if (tripIds.length === 0) {
      return []
    }
    where.id = { [Op.in]: tripIds }
  }

  const trips = await Trip.findAll({
    where,
    order: [['updatedAt', 'DESC']]
  })

  const usersByTripId = await findUsersByTripIds(trips.map((trip) => trip.id))

  return trips.map((trip) => {
    const plain = trip.toJSON()
    plain.users = usersByTripId.get(trip.id) || []
    return plain
  })
}

module.exports = {
  parseUserId,
  linkTripToUser,
  findTripIdsForUser,
  findUsersByTripIds,
  findTripsForAdmin
}
