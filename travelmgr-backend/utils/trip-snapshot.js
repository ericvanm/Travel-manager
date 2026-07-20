/**
 * Read-only trip aggregate for consistency checks, AI adapt, and LLM context.
 *
 * Merges modern Activity rows with legacy `accommodations` table entries into one list
 * per stage so downstream code does not branch on two storage models.
 */
const { Trip, Stage, Activity, Country, Accommodation } = require('../models/DBmodels')
const { accommodationToActivity } = require('./trip-flatten')

const { ACTIVITY_TYPE_LABELS } = require('./activity-types')

/**
 * Loads trip metadata, stages (with country), and all activities for a trip id.
 *
 * @param {number|string} tripId
 * @returns {Promise<{ trip: object, stages: object[] }|null>} Null when trip not found.
 */
const loadTripSnapshot = async (tripId) => {
  const trip = await Trip.findByPk(tripId)
  if (!trip) return null

  const stages = await Stage.findAll({
    where: { tripId },
    include: [{ model: Country, as: 'Country' }],
    order: [['startDate', 'ASC']]
  })

  const stageIds = stages.map((s) => s.id)
  const activities = stageIds.length
    ? await Activity.findAll({
      where: { stageId: stageIds },
      order: [['startDateTime', 'ASC']]
    })
    : []

  const legacyAccommodations = stageIds.length
    ? await Accommodation.findAll({
      where: { stageId: stageIds },
      order: [['checkInDate', 'ASC']]
    })
    : []

  const activitiesByStage = new Map()
  for (const activity of activities) {
    const list = activitiesByStage.get(activity.stageId) || []
    list.push(activity.toJSON())
    activitiesByStage.set(activity.stageId, list)
  }

  for (const accommodation of legacyAccommodations) {
    const normalized = accommodationToActivity(accommodation.toJSON())
    const list = activitiesByStage.get(accommodation.stageId) || []
    list.push(normalized)
    activitiesByStage.set(accommodation.stageId, list)
  }

  return {
    trip: trip.toJSON(),
    stages: stages.map((stage) => ({
      ...stage.toJSON(),
      activities: activitiesByStage.get(stage.id) || []
    }))
  }
}

/**
 * Human-readable trip summary fed to the AI adapt flow before the user request.
 *
 * Highlights reserved items so the LLM (and UI) warn before changing booked activities.
 *
 * @param {{ trip: object, stages: object[] }} snapshot
 * @param {string} [language] - Reserved for future localized synthesis strings.
 */
const buildTripSynthesis = (snapshot, language = 'fr') => {
  const { trip, stages } = snapshot
  const allActivities = stages.flatMap((s) => s.activities || [])
  const totalCost = allActivities.reduce((sum, a) => sum + (Number(a.cost) || 0), 0)
  const reservedCount = allActivities.filter((a) => a.reservationStatus === 'reserved').length
  const toBookCount = allActivities.filter((a) => a.reservationStatus === 'to_reserve').length

  const stageLines = stages.map((stage) => {
    const count = (stage.activities || []).length
    const dates = [stage.startDate, stage.endDate].filter(Boolean).join(' → ')
    return `${stage.name}${dates ? ` (${dates})` : ''} — ${count} activité(s)`
  })

  const summaryParts = [
    `Voyage « ${trip.name} »`,
    trip.startDate && trip.endDate ? `Du ${String(trip.startDate).slice(0, 10)} au ${String(trip.endDate).slice(0, 10)}` : null,
    trip.departureLocation ? `Départ : ${trip.departureLocation}` : null,
    `${stages.length} étape(s), ${allActivities.length} activité(s)`,
    trip.budget ? `Budget prévu : ${trip.budget} ${trip.currency || 'EUR'}` : null,
    totalCost > 0 ? `Coût actuel enregistré : ${totalCost} ${trip.currency || 'EUR'}` : null,
    `${reservedCount} réservé(s), ${toBookCount} à réserver`
  ].filter(Boolean)

  return {
    title: trip.name,
    summary: summaryParts.join('\n'),
    highlights: [
      trip.departureLocation,
      `${stages.length} étapes`,
      `${allActivities.length} activités`,
      totalCost > 0 ? `${totalCost} ${trip.currency || 'EUR'} enregistrés` : null
    ].filter(Boolean),
    warnings: reservedCount > 0
      ? [`${reservedCount} élément(s) déjà marqué(s) comme réservé(s) — les modifier peut impacter vos réservations.`]
      : [],
    stageOverview: stageLines,
    stats: {
      stageCount: stages.length,
      activityCount: allActivities.length,
      totalCost,
      reservedCount,
      toBookCount
    },
    language
  }
}

const flattenActivities = (snapshot) =>
  require('./trip-flatten').flattenActivities(snapshot)

module.exports = {
  loadTripSnapshot,
  buildTripSynthesis,
  flattenActivities,
  ACTIVITY_TYPE_LABELS
}
