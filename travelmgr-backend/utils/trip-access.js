/**
 * Trip access control: enforce authenticated, owner-scoped access to trips and nested resources.
 */
const { Stage, Activity, Trip } = require('../models/DBmodels')
const { getUserId } = require('./auth-helpers')
const { findTripIdsForUser } = require('./trip-ownership')

const parseTripId = (value) => {
  const parsed = Number.parseInt(String(value), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const userCanAccessTrip = async (userId, tripId) => {
  const numericTripId = parseTripId(tripId)
  if (!userId || !numericTripId) {
    return false
  }
  const ownedTripIds = await findTripIdsForUser(userId)
  return ownedTripIds.includes(numericTripId)
}

const resolveTripIdFromStage = async (stageId) => {
  const stage = await Stage.findByPk(stageId, { attributes: ['tripId'] })
  return stage?.tripId ?? null
}

const resolveTripIdFromActivity = async (activityId) => {
  const activity = await Activity.findByPk(activityId, { attributes: ['stageId'] })
  if (!activity?.stageId) {
    return null
  }
  return resolveTripIdFromStage(activity.stageId)
}

/**
 * Returns false and sends the HTTP response when access is denied.
 * Uses 404 for missing ownership to avoid leaking trip existence to other users.
 * Admins may read any trip via GET (read-only inspection from AdminPanel).
 */
const ensureTripAccess = async (req, res, tripId) => {
  const userId = getUserId(req)
  if (!userId) {
    res.status(401).json({ error: 'Access denied' })
    return false
  }

  const numericTripId = parseTripId(tripId)
  if (!numericTripId) {
    res.status(400).json({ error: 'Invalid trip id' })
    return false
  }

  if (req.user?.role === 'admin') {
    const readOnly = req.method === 'GET' || req.method === 'HEAD'
    if (!readOnly) {
      res.status(403).json({ error: 'Admin cannot modify trip data via this route' })
      return false
    }
    const trip = await Trip.findByPk(numericTripId, { attributes: ['id'] })
    if (!trip) {
      res.status(404).json({ error: 'Trip not found' })
      return false
    }
    return true
  }

  if (!await userCanAccessTrip(userId, numericTripId)) {
    res.status(404).json({ error: 'Trip not found' })
    return false
  }

  return true
}

const requireTripAccessParam = (paramName = 'id') => async (req, res, next) => {
  try {
    const tripId = req.params[paramName]
    if (!parseTripId(tripId)) {
      return res.status(400).json({ error: 'Invalid trip id' })
    }
    if (await ensureTripAccess(req, res, tripId)) {
      next()
    }
  } catch (error) {
    next(error)
  }
}

const requireStageAccessParam = (paramName = 'id') => async (req, res, next) => {
  try {
    const stageId = req.params[paramName]
    const tripId = await resolveTripIdFromStage(stageId)
    if (!tripId) {
      return res.status(404).json({ error: 'Stage not found' })
    }
    if (await ensureTripAccess(req, res, tripId)) {
      next()
    }
  } catch (error) {
    next(error)
  }
}

const requireActivityAccessParam = (paramName = 'id') => async (req, res, next) => {
  try {
    const activityId = req.params[paramName]
    const tripId = await resolveTripIdFromActivity(activityId)
    if (!tripId) {
      return res.status(404).json({ error: 'Activity not found' })
    }
    if (await ensureTripAccess(req, res, tripId)) {
      next()
    }
  } catch (error) {
    next(error)
  }
}

const requireTripAccessFromBody = (field = 'tripId') => async (req, res, next) => {
  try {
    const tripId = req.body?.[field]
    if (!parseTripId(tripId)) {
      return res.status(400).json({ error: 'Invalid trip id' })
    }
    if (await ensureTripAccess(req, res, tripId)) {
      next()
    }
  } catch (error) {
    next(error)
  }
}

module.exports = {
  parseTripId,
  userCanAccessTrip,
  resolveTripIdFromStage,
  resolveTripIdFromActivity,
  ensureTripAccess,
  requireTripAccessParam,
  requireStageAccessParam,
  requireActivityAccessParam,
  requireTripAccessFromBody
}
