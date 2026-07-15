const router = require('express').Router()
const jwt = require('jsonwebtoken')
const { Op } = require('sequelize')
const {
  TripPlanningSession,
  Trip,
  Stage,
  Activity,
  Country
} = require('../models/DBmodels')
const {
  validateFormData,
  generateSynthesis,
  generateItinerary,
  getActivityTypeId,
  normalizeFormData
} = require('../utils/ai-planning-service')

const optionalAuth = (req, _res, next) => {
  if (req.session?.isLoggedIn && req.session.user) {
    req.user = req.session.user
    return next()
  }
  const token = req.session?.token
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.SECRET)
    } catch {
      req.user = null
    }
  }
  next()
}

const getUserId = (req) => req.user?.id || null

const findSessionForUser = async (sessionId, userId) => {
  const where = { id: sessionId }
  if (userId) {
    where.userId = userId
  }
  return TripPlanningSession.findOne({ where })
}

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

const createTripFromItinerary = async (itinerary, formData = {}) => {
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

  const createTransportActivity = async (stage, transport) => {
    if (!transport) return
    await Activity.create({
      stageId: stage.id,
      activityTypeId: getActivityTypeId(transport.activityType || 'tour'),
      name: transport.label || transport.description,
      startDateTime: transport.startDateTime || null,
      endDateTime: transport.endDateTime || null,
      comments: transport.description || `Mode: ${transport.mode}`,
      cost: transport.estimatedCost || null,
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
      cost: data.estimatedCost || data.cost || null,
      checkInDate: data.checkInDate || null,
      checkOutDate: data.checkOutDate || null,
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
      await createActivityFromData(stage, {
        ...accommodation,
        activityType: 'hotel',
        startDateTime: accommodation.checkInDate ? `${accommodation.checkInDate}T15:00:00Z` : null,
        endDateTime: accommodation.checkOutDate ? `${accommodation.checkOutDate}T11:00:00Z` : null,
        comments: `Type: ${accommodation.type}. Suggestion IA — à confirmer.`
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

router.use(optionalAuth)

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

    const synthesis = await generateSynthesis(validation.formData)
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

    const itinerary = await generateItinerary(session.formData)
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

    const itinerary = await generateItinerary(
      session.formData,
      String(feedback).trim(),
      session.itinerary
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

    const createdTrip = await createTripFromItinerary(session.itinerary, session.formData || {})
    await session.update({
      status: 'accepted',
      tripId: createdTrip.id
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
