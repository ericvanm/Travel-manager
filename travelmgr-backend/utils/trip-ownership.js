/**
 * Trip ownership resolution for Travel Manager.
 *
 * Why this module exists:
 * - Trips are not owned by a single `owner_user_id` column anymore.
 * - Ownership is inferred from several tables that evolved with AI features.
 *
 * Sources of truth (combined with SQL UNION):
 * 1. `trip_lists` — canonical link created when a user creates a trip or accepts AI planning.
 * 2. `trip_planning_sessions` — fallback for trips linked after AI itinerary acceptance.
 * 3. `trip_adaptation_sessions` — fallback for trips opened in the AI adapt flow.
 *
 * Consumers: admin panel (`GET /api/admin/trips`), user trip routes via `trip-access.js`.
 * Admins may read any trip via GET (read-only inspection from AdminPanel); mutations stay on /api/admin/*.
 */
const { Op, QueryTypes } = require('sequelize')
const { Trip, TripList } = require('../models/DBmodels')

/**
 * Normalizes IDs coming from query params, request bodies, or JWT payloads.
 * Returns null instead of throwing so callers can treat "missing/invalid" uniformly.
 *
 * @param {unknown} value - Raw id (string, number, or array from query string).
 * @returns {number|null} Positive integer id, or null when invalid.
 */
const parseUserId = (value) => {
  if (value === undefined || value === null || value === '') {
    return null
  }

  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number.parseInt(String(raw), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

/**
 * Creates the explicit owner ↔ trip row in `trip_lists`.
 *
 * Called after manual trip creation and when AI planning is accepted, so later deletes
 * and admin views can resolve ownership without scanning session tables.
 *
 * @param {number|string} tripId
 * @param {number|string} userId
 * @returns {Promise<import('../models/DBmodels').TripList|null>} Existing or new link; null if ids invalid.
 */
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

/**
 * Returns all trip ids a user can access according to ownership rules above.
 *
 * Uses raw SQL UNION rather than three Sequelize queries to deduplicate in the database
 * and keep admin filtering consistent with historical AI sessions.
 *
 * @param {number|string} userId
 * @returns {Promise<number[]>} Sorted trip ids (empty array when user id is invalid).
 */
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

/**
 * Maps each trip id to the list of users linked through any ownership source.
 * Used by the admin panel to show who owns or interacted with a trip via AI flows.
 *
 * @param {Array<number|string>} tripIds
 * @returns {Promise<Map<number, Array<{ id: number, username: string, name: string }>>>}
 */
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

/**
 * Admin-facing trip list with optional filter by user.
 *
 * When `userId` is provided, only trips reachable via {@link findTripIdsForUser} are returned.
 * Each trip is enriched with a `users` array for display in the admin UI.
 *
 * @param {number|string|null} [userId] - Optional filter; omit to list all trips.
 * @returns {Promise<Array<Record<string, unknown>>>} Trip rows with `users` attached.
 */
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
