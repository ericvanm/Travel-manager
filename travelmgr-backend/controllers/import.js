const router = require('express').Router()
const { Trip, Stage, Activity, Country } = require('../models/DBmodels')
const {
  parseICS,
  extractTripInfo,
  groupEventsByStage,
  convertToActivity,
  resolveStageName,
  groupActivitiesIntoStages,
  collectActivitiesFromStages,
  processStageActivities
} = require('../utils/ics-import-helpers')

const findOrCreateTrip = async (TripModel, { tripId, tripName, tripInfo, userId }) => {
  if (tripId) {
    const trip = await TripModel.findByPk(tripId)
    if (!trip) {
      return { error: { status: 404, message: 'Trip not found' } }
    }
    await trip.update({
      description: tripInfo.description,
      startDate: tripInfo.startDate,
      endDate: tripInfo.endDate
    })
    return { trip }
  }

  const trip = await TripModel.create({
    name: tripName || tripInfo.name,
    description: tripInfo.description,
    startDate: tripInfo.startDate,
    endDate: tripInfo.endDate
  })

  const { linkTripToUser } = require('../utils/trip-ownership')
  if (userId) {
    await linkTripToUser(trip.id, userId)
  }

  return { trip }
}

// POST import ICS file
router.post('/', async (req, res) => {
  try {
    const { icsContent, userId, tripId, tripName } = req.body

    if (!icsContent) {
      return res.status(400).json({ error: 'ICS content is required' })
    }

    const events = parseICS(icsContent)
    const tripInfo = extractTripInfo(events, icsContent)
    if (!tripInfo) {
      return res.status(400).json({ error: 'Could not extract trip information' })
    }

    const tripResult = await findOrCreateTrip(Trip, { tripId, tripName, tripInfo, userId })
    if (tripResult.error) {
      return res.status(tripResult.error.status).json({ error: tripResult.error.message })
    }

    const stageGroups = groupEventsByStage(events)
    const southAfrica = await Country.findOne({ where: { code: 'ZA' } })
    const allActivities = collectActivitiesFromStages(stageGroups)
    const finalStages = groupActivitiesIntoStages(allActivities)

    for (const stageData of finalStages) {
      const stage = await Stage.create({
        name: resolveStageName(stageData),
        tripId: tripResult.trip.id,
        countryId: southAfrica ? southAfrica.id : null,
        startDate: stageData.startDate,
        endDate: stageData.endDate
      })

      await processStageActivities(Activity, stage, stageData.activities, convertToActivity)
    }

    res.json({
      message: 'Trip imported successfully',
      tripId: tripResult.trip.id,
      stagesCreated: stageGroups.length
    })
  } catch (error) {
    console.error('Import error:', error)
    res.status(500).json({ error: 'Failed to import trip' })
  }
})

module.exports = router
