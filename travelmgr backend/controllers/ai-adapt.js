/**
 * AI adaptation of an existing trip (propose changes, user review, apply).
 *
 * Two entry points:
 * - `POST /trips/:id/start` — user describes desired changes in natural language.
 * - `POST /trips/:id/resolve-consistency` — builds the prompt from consistency issues.
 *
 * A JSON snapshot is frozen on the session so the LLM proposal matches what the user saw.
 * On accept, changes are applied then missing hotel nights may be auto-filled.
 */
const router = require('express').Router()
const {
  TripAdaptationSession,
  Trip
} = require('../models/DBmodels')
const { optionalAuth, getUserId, getUserLanguage } = require('../utils/auth-helpers')
const { loadTripSnapshot, buildTripSynthesis } = require('../utils/trip-snapshot')
const {
  proposeAdaptations,
  detectReservedImpacts,
  applyProposedChanges,
  normalizeProposedChanges
} = require('../utils/ai-adapt-service')
const {
  validateAdaptationAccommodation,
  fillAccommodationGaps
} = require('../utils/trip-accommodation-validation')
const { validateTripConsistency, buildConsistencyFixRequest } = require('../utils/trip-consistency')

const findSession = async (sessionId, userId) => {
  const session = await TripAdaptationSession.findByPk(sessionId)
  if (!session) return null
  if (session.userId != null && userId != null && session.userId !== userId) return null
  return session
}

router.use(optionalAuth)

router.post('/trips/:tripId/resolve-consistency', async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.tripId)
    if (!trip) return res.status(404).json({ error: 'Trip not found' })

    const snapshot = await loadTripSnapshot(trip.id)
    if (!snapshot) return res.status(404).json({ error: 'Trip not found' })

    const language = await getUserLanguage(req, 'fr')
    const consistency = validateTripConsistency(snapshot)
    const fixable = consistency.errorCount > 0 || consistency.warningCount > 0

    if (!fixable) {
      return res.json({
        success: true,
        alreadyConsistent: true,
        consistency,
        message: 'Trip has no errors or warnings to resolve'
      })
    }

    const adaptationRequest = buildConsistencyFixRequest(consistency, language)
    const userId = getUserId(req)
    const synthesis = buildTripSynthesis(snapshot, language)

    const session = await TripAdaptationSession.create({
      userId,
      tripId: trip.id,
      status: 'synthesis_ready',
      tripSnapshot: snapshot,
      synthesis,
      language,
      adaptationRequest
    })

    const proposedChanges = await proposeAdaptations(snapshot, adaptationRequest, language, {
      userId,
      feature: 'adapt',
      sessionType: 'adapt',
      sessionId: session.id,
      tripId: trip.id
    })
    const reservedImpacts = detectReservedImpacts(snapshot, proposedChanges)
    const accommodationWarnings = validateAdaptationAccommodation(snapshot, proposedChanges)

    await session.update({
      proposedChanges,
      reservedImpacts,
      status: 'proposal_ready'
    })

    res.json({
      success: true,
      alreadyConsistent: false,
      sessionId: session.id,
      consistency,
      adaptationRequest,
      proposedChanges,
      reservedImpacts,
      hasReservedImpacts: reservedImpacts.length > 0,
      accommodationWarnings
    })
  } catch (error) {
    console.error('Error resolving trip consistency:', error)
    res.status(500).json({ error: error.message })
  }
})

router.post('/trips/:tripId/start', async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.tripId)
    if (!trip) return res.status(404).json({ error: 'Trip not found' })

    const snapshot = await loadTripSnapshot(trip.id)
    if (!snapshot) return res.status(404).json({ error: 'Trip not found' })

    const language = await getUserLanguage(req, 'fr')
    const synthesis = buildTripSynthesis(snapshot, language)
    const userId = getUserId(req)

    const session = await TripAdaptationSession.create({
      userId,
      tripId: trip.id,
      status: 'synthesis_ready',
      tripSnapshot: snapshot,
      synthesis,
      language
    })

    res.json({
      sessionId: session.id,
      synthesis,
      snapshot
    })
  } catch (error) {
    console.error('Error starting adapt session:', error)
    res.status(500).json({ error: error.message })
  }
})

router.post('/sessions/:id/propose', async (req, res) => {
  try {
    const session = await findSession(req.params.id, getUserId(req))
    if (!session) return res.status(404).json({ error: 'Session not found' })

    const adaptationRequest = String(req.body.adaptationRequest || '').trim()
    if (!adaptationRequest) {
      return res.status(400).json({ error: 'adaptation_request_required' })
    }

    const snapshot = session.tripSnapshot
    const language = session.language || await getUserLanguage(req, 'fr')
    const proposedChanges = await proposeAdaptations(snapshot, adaptationRequest, language, {
      userId: getUserId(req),
      feature: 'adapt',
      sessionType: 'adapt',
      sessionId: session.id,
      tripId: session.tripId
    })
    const reservedImpacts = detectReservedImpacts(snapshot, proposedChanges)
    const accommodationWarnings = validateAdaptationAccommodation(snapshot, proposedChanges)

    await session.update({
      adaptationRequest,
      proposedChanges,
      reservedImpacts,
      status: 'proposal_ready'
    })

    res.json({
      success: true,
      proposedChanges,
      reservedImpacts,
      hasReservedImpacts: reservedImpacts.length > 0,
      accommodationWarnings
    })
  } catch (error) {
    console.error('Error proposing adaptations:', error)
    res.status(500).json({ error: error.message })
  }
})

router.get('/sessions/:id', async (req, res) => {
  try {
    const session = await findSession(req.params.id, getUserId(req))
    if (!session) return res.status(404).json({ error: 'Session not found' })
    res.json(session)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/sessions/:id/accept', async (req, res) => {
  try {
    const session = await findSession(req.params.id, getUserId(req))
    if (!session) return res.status(404).json({ error: 'Session not found' })
    if (!session.proposedChanges) {
      return res.status(400).json({ error: 'No proposed changes to apply' })
    }

    const proposedChanges = normalizeProposedChanges(session.proposedChanges)
    const applied = await applyProposedChanges(session.tripId, proposedChanges)

    let updatedSnapshot = await loadTripSnapshot(session.tripId)
    let gapFill = { created: 0 }
    let accommodationWarnings = validateAdaptationAccommodation(updatedSnapshot)

    if (!accommodationWarnings.covered) {
      gapFill = await fillAccommodationGaps(session.tripId, updatedSnapshot)
      if (gapFill.created > 0) {
        updatedSnapshot = await loadTripSnapshot(session.tripId)
        accommodationWarnings = validateAdaptationAccommodation(updatedSnapshot)
      }
    }

    await session.update({ status: 'applied' })

    res.json({
      success: true,
      applied: { ...applied, accommodationAutoFilled: gapFill.created },
      accommodationWarnings,
      message: accommodationWarnings.covered
        ? gapFill.created > 0
          ? `Adaptations applied; ${gapFill.created} accommodation(s) added automatically`
          : 'Adaptations applied successfully'
        : 'Adaptations applied with accommodation gaps'
    })
  } catch (error) {
    console.error('Error applying adaptations:', error)
    res.status(500).json({ error: error.message })
  }
})

router.post('/sessions/:id/reject', async (req, res) => {
  try {
    const session = await findSession(req.params.id, getUserId(req))
    if (!session) return res.status(404).json({ error: 'Session not found' })
    await session.update({
      status: 'rejected',
      proposedChanges: null,
      reservedImpacts: [],
      adaptationRequest: null
    })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
