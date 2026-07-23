/**
 * AI trip planning sessions and materialization into Trip/Stage/Activity rows.
 *
 * Flow: draft form → validate/synthesis → confirm itinerary → optional revise → accept.
 * The itinerary JSON stays in `trip_planning_sessions` until accept; only then is a real
 * trip created and `trip_id` stored on the session (ownership link + admin audit trail).
 */
const router = require('express').Router()
const { Op } = require('sequelize')
const {
  TripPlanningSession,
  Trip,
  Stage,
  Activity,
  Country,
  AiInteractionLog
} = require('../models/DBmodels')
const {
  validateFormData,
  generateSynthesis,
  generateItinerary,
  getActivityTypeId,
  normalizeFormData
} = require('../utils/ai-planning-service')
const { requireAuth, getUserId, getUserLanguage } = require('../utils/auth-helpers')
const { linkTripToUser } = require('../utils/trip-ownership')
const { logAiInteraction } = require('../utils/ai-interaction-logger')
const { buildAccommodationDateTimes, resolveAccommodationTimezone } = require('../utils/hotel-datetime')

/**
 * Resolves a planning session scoped to the authenticated user when userId is known.
 * @param {number|string} sessionId
 * @param {number|null} userId
 */
const findSessionForUser = async (sessionId, userId) => {
  const where = { id: sessionId }
  if (userId) {
    where.userId = userId
  }
  return TripPlanningSession.findOne({ where })
}

/**
 * Maps AI stage metadata to a Country row (code, name fuzzy match, FR fallback).
 * Used when persisting generated stages so map/consistency features have a country id.
 */
const findCountryForStage = async (countryCode, stageName) => {
  if (countryCode) {
    const byCode = await Country.findOne({ where: { code: countryCode.toUpperCase() } })
    if (byCode) return byCode
  }

  const searchTerm = (stageName || '').split(',')[0].trim()
  if (searchTerm) {
    const byName = await Country.findOne({
      where: { name: { [Op.iLike]: `%${searchTerm}%` } }
    })
    if (byName) return byName
  }

  return Country.findOne({ where: { code: 'FR' } }) || Country.findOne()
}

/**
 * Persists a validated AI itinerary as relational data.
 *
 * Hotels are stored as Activity rows (type id 7), not legacy Accommodation rows.
 * Appends a timestamp to the trip name if another trip already uses the same name globally.
 *
 * @param {object} itinerary - Parsed itinerary from ai-planning-service.
 * @param {object} [formData] - Original planning form (departure location, etc.).
 * @param {number|null} [userId] - Owner to link via trip_lists.
 * @returns {Promise<import('../models/DBmodels').Trip>}
 */
const createTripFromItinerary = async (itinerary, formData = {}, userId = null) => {
  const { trip, stages: stageList } = itinerary

  const existingTrip = await Trip.findOne({ where: { name: trip.name } })
  if (existingTrip) {
    trip.name = `${trip.name} (${Date.now()})`
  }

  const createdTrip = await Trip.create({
    name: trip.name,
    description: trip.description,
    startDate: trip.startDate,
    endDate: trip.endDate,
    budget: trip.budget,
    currency: trip.currency,
    departureLocation: formData.departureLocation || itinerary.outboundTransport?.departureLocation || null
  })

  if (userId) {
    await linkTripToUser(createdTrip.id, userId)
  }

  const createTransportActivity = async (stage, transport) => {
    if (!transport) return
    const activityType = transport.activityType || 'tour'
    const activityTypeId = getActivityTypeId(activityType)
    await Activity.create({
      stageId: stage.id,
      activityTypeId,
      name: transport.label || transport.description,
      startDateTime: transport.startDateTime || null,
      endDateTime: transport.endDateTime || null,
      comments: transport.description || `Mode: ${transport.mode}`,
      cost: activityType === 'private_car' ? 0 : (transport.estimatedCost ?? null),
      city: transport.arrivalLocation || null,
      departureLocation: transport.departureLocation || null,
      arrivalLocation: transport.arrivalLocation || null,
      reservationStatus: transport.reservationStatus || 'to_reserve',
      bookingUrl: transport.bookingUrl || null,
      latitude: transport.latitude || null,
      longitude: transport.longitude || null
    })
  }

  const createActivityFromData = async (stage, data, defaults = {}) => {
    await Activity.create({
      stageId: stage.id,
      activityTypeId: getActivityTypeId(data.activityType || defaults.activityType || 'tour'),
      name: data.name,
      startDateTime: data.startDateTime || null,
      endDateTime: data.endDateTime || null,
      city: data.city || null,
      comments: data.comments || null,
      address: data.address || null,
      phone: data.phone || null,
      cost: data.estimatedCost || data.cost || null,
      checkInDate: data.checkInDate || null,
      checkOutDate: data.checkOutDate || null,
      checkInTime: data.checkInTime || null,
      checkOutTime: data.checkOutTime || null,
      reservationStatus: data.reservationStatus || 'to_reserve',
      bookingUrl: data.bookingUrl || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      departureLocation: data.departureLocation || null,
      arrivalLocation: data.arrivalLocation || null
    })
  }

  for (let stageIndex = 0; stageIndex < (stageList || []).length; stageIndex += 1) {
    const stageData = stageList[stageIndex]
    const country = await findCountryForStage(stageData.countryCode, stageData.name)
    const stage = await Stage.create({
      tripId: createdTrip.id,
      countryId: country?.id || 1,
      name: stageData.name,
      startDate: stageData.startDate,
      endDate: stageData.endDate
    })

    if (stageIndex === 0 && itinerary.outboundTransport) {
      await createTransportActivity(stage, {
        ...itinerary.outboundTransport,
        startDateTime: itinerary.outboundTransport.startDateTime
          || (trip.startDate ? `${trip.startDate}T06:00:00Z` : null),
        endDateTime: itinerary.outboundTransport.endDateTime
          || (trip.startDate ? `${trip.startDate}T14:00:00Z` : null)
      })
    } else if (stageData.arrivalTransport) {
      await createTransportActivity(stage, stageData.arrivalTransport)
    }

    for (const activityData of stageData.activities || []) {
      await createActivityFromData(stage, activityData)
    }

    for (const accommodation of stageData.accommodations || []) {
      const stageCity = (stageData.name || '').split('—')[0].split(',')[0].trim()
      const stageTimezone = country?.timezone || resolveAccommodationTimezone(accommodation, stageData)
      const { startDateTime, endDateTime, checkInTime, checkOutTime } = buildAccommodationDateTimes(accommodation, stageTimezone)
      await createActivityFromData(stage, {
        ...accommodation,
        activityType: 'hotel',
        city: accommodation.city || stageCity || null,
        startDateTime: accommodation.startDateTime || startDateTime,
        endDateTime: accommodation.endDateTime || endDateTime,
        checkInTime: accommodation.checkInTime || checkInTime,
        checkOutTime: accommodation.checkOutTime || checkOutTime,
        address: accommodation.address || null,
        phone: accommodation.phone || null,
        comments: accommodation.comments || `Type: ${accommodation.type || 'hôtel'}. Suggestion IA — à confirmer.`
      })
    }

    if (stageIndex === stageList.length - 1 && itinerary.returnTransport) {
      await createTransportActivity(stage, {
        ...itinerary.returnTransport,
        startDateTime: itinerary.returnTransport.startDateTime
          || (trip.endDate ? `${trip.endDate}T10:00:00Z` : null),
        endDateTime: itinerary.returnTransport.endDateTime
          || (trip.endDate ? `${trip.endDate}T20:00:00Z` : null)
      })
    }
  }

  return createdTrip
}

router.use(requireAuth)

router.get('/inspiration-sites', (req, res) => {
  try {
    const { loadInspirationSitesConfig, listDefaultSiteNames } = require('../utils/activity-inspiration-sites')
    const config = loadInspirationSitesConfig()
    res.json({
      sites: config.sites.map(({ name }) => ({ name })),
      defaultSiteNames: listDefaultSiteNames()
    })
  } catch (error) {
    console.error('Error loading inspiration sites:', error)
    res.status(500).json({ error: 'Failed to load inspiration sites' })
  }
})

router.get('/sessions', async (req, res) => {
  try {
    const userId = getUserId(req)
    const where = userId ? { userId } : {}
    const sessions = await TripPlanningSession.findAll({
      where,
      order: [['updatedAt', 'DESC']],
      limit: 50
    })
    res.json(sessions)
  } catch (error) {
    console.error('Error listing planning sessions:', error)
    res.status(500).json({ error: 'Failed to list planning sessions' })
  }
})

router.get('/sessions/:id', async (req, res) => {
  try {
    const session = await findSessionForUser(req.params.id, getUserId(req))
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }
    res.json(session)
  } catch (error) {
    console.error('Error fetching planning session:', error)
    res.status(500).json({ error: 'Failed to fetch planning session' })
  }
})

router.post('/sessions', async (req, res) => {
  try {
    const formData = normalizeFormData(req.body.formData || req.body)
    const userId = getUserId(req)

    let session
    if (req.body.sessionId) {
      session = await findSessionForUser(req.body.sessionId, userId)
      if (!session) {
        return res.status(404).json({ error: 'Session not found' })
      }
      await session.update({
        formData,
        status: 'draft',
        synthesis: null,
        itinerary: null
      })
    } else {
      session = await TripPlanningSession.create({
        userId,
        formData,
        status: 'draft'
      })
    }

    res.json(session)
  } catch (error) {
    console.error('Error saving planning session:', error)
    res.status(500).json({ error: 'Failed to save planning session' })
  }
})

router.post('/sessions/:id/validate', async (req, res) => {
  try {
    const session = await findSessionForUser(req.params.id, getUserId(req))
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    const formData = normalizeFormData(req.body.formData || session.formData)
    const validation = validateFormData(formData)

    if (!validation.isValid) {
      await session.update({ formData, status: 'draft' })
      return res.status(400).json({
        success: false,
        validation,
        requiresFormCorrection: true
      })
    }

    const language = await getUserLanguage(req, 'fr')
    const userId = getUserId(req)
    const logContext = {
      userId,
      feature: 'planning',
      sessionType: 'planning',
      sessionId: session.id,
      tripId: session.tripId || null
    }
    const synthesis = await generateSynthesis(validation.formData, language, logContext)
    await session.update({
      formData: validation.formData,
      synthesis,
      status: 'synthesis_pending'
    })

    res.json({
      success: true,
      validation,
      synthesis,
      sessionId: session.id,
      requiresConfirmation: true
    })
  } catch (error) {
    console.error('Error validating planning session:', error)
    res.status(500).json({ error: error.message })
  }
})

router.post('/sessions/:id/confirm-synthesis', async (req, res) => {
  try {
    const session = await findSessionForUser(req.params.id, getUserId(req))
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    if (session.status !== 'synthesis_pending' && !session.synthesis) {
      return res.status(400).json({ error: 'Synthèse non disponible. Validez d\'abord le formulaire.' })
    }

    const language = await getUserLanguage(req, 'fr')
    const userId = getUserId(req)
    const logContext = {
      userId,
      feature: 'planning',
      sessionType: 'planning',
      sessionId: session.id,
      tripId: session.tripId || null
    }
    const itinerary = await generateItinerary(session.formData, null, null, language, logContext)
    await session.update({
      itinerary,
      status: 'itinerary_generated',
      revisionFeedback: null
    })

    res.json({
      success: true,
      itinerary,
      sessionId: session.id
    })
  } catch (error) {
    console.error('Error generating itinerary:', error)
    res.status(500).json({ error: error.message })
  }
})

router.post('/sessions/:id/revise', async (req, res) => {
  try {
    const { feedback } = req.body
    if (!feedback || !String(feedback).trim()) {
      return res.status(400).json({ error: 'Feedback requis pour la révision' })
    }

    const session = await findSessionForUser(req.params.id, getUserId(req))
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    const language = await getUserLanguage(req, 'fr')
    const userId = getUserId(req)
    const logContext = {
      userId,
      feature: 'planning',
      sessionType: 'planning',
      sessionId: session.id,
      tripId: session.tripId || null
    }
    const itinerary = await generateItinerary(
      session.formData,
      String(feedback).trim(),
      session.itinerary,
      language,
      logContext
    )

    await session.update({
      itinerary,
      status: 'itinerary_generated',
      revisionCount: session.revisionCount + 1,
      revisionFeedback: String(feedback).trim()
    })

    res.json({
      success: true,
      itinerary,
      revisionCount: session.revisionCount + 1
    })
  } catch (error) {
    console.error('Error revising itinerary:', error)
    res.status(500).json({ error: error.message })
  }
})

router.post('/sessions/:id/accept', async (req, res) => {
  try {
    const session = await findSessionForUser(req.params.id, getUserId(req))
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    if (!session.itinerary) {
      return res.status(400).json({ error: 'Aucun itinéraire à accepter' })
    }

    const createdTrip = await createTripFromItinerary(
      session.itinerary,
      session.formData || {},
      session.userId || getUserId(req)
    )
    await session.update({
      status: 'accepted',
      tripId: createdTrip.id
    })

    const ownerId = session.userId || getUserId(req)
    await AiInteractionLog.update(
      { tripId: createdTrip.id },
      { where: { sessionType: 'planning', sessionId: session.id } }
    )
    await logAiInteraction({
      userId: ownerId,
      feature: 'planning',
      operation: 'accept',
      sessionType: 'planning',
      sessionId: session.id,
      tripId: createdTrip.id,
      parsedResponse: { tripId: createdTrip.id, name: createdTrip.name },
      status: 'success'
    })

    res.json({
      success: true,
      trip: createdTrip,
      message: 'Voyage créé avec succès'
    })
  } catch (error) {
    console.error('Error accepting itinerary:', error)
    res.status(500).json({ error: error.message })
  }
})

router.post('/sessions/:id/reject', async (req, res) => {
  try {
    const session = await findSessionForUser(req.params.id, getUserId(req))
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    await session.update({
      status: 'rejected',
      itinerary: null,
      synthesis: null
    })

    res.json({
      success: true,
      formData: session.formData,
      sessionId: session.id
    })
  } catch (error) {
    console.error('Error rejecting itinerary:', error)
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
