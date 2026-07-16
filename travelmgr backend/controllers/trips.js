const router = require('express').Router()
const { Op } = require('sequelize')
const { Trip, Stage, Activity, Transport, Accommodation, Expense, Country, ActivityType } = require('../models/DBmodels')
const { buildTripMapData } = require('../utils/trip-map-service')
const { getUserLanguage, optionalAuth, getUserId } = require('../utils/auth-helpers')
const {
  parseCSVLine,
  parseCSVDate,
  rowToObject,
  buildNonHotelActivity,
  updateHotelGroup,
  hotelGroupsToActivities,
  groupActivitiesIntoStages,
  activityToRecord
} = require('../utils/csv-import-helpers')
const logger = require('../utils/logger')
const { loadTripSnapshot } = require('../utils/trip-snapshot')
const { validateTripConsistency, toSummary } = require('../utils/trip-consistency')

router.use(optionalAuth)

// GET consistency summary for all trips (list indicators)
router.get('/consistency/summary', async (req, res) => {
  try {
    const trips = await Trip.findAll({ order: [['updatedAt', 'DESC']] })
    const summaries = []
    for (const trip of trips) {
      try {
        const snapshot = await loadTripSnapshot(trip.id)
        if (!snapshot) {
          summaries.push({ tripId: trip.id, health: 'ok', budgetStatus: 'none', issueCount: 0, errorCount: 0, warningCount: 0 })
        } else {
          summaries.push(toSummary(validateTripConsistency(snapshot)))
        }
      } catch (err) {
        console.error(`Consistency check failed for trip ${trip.id}:`, err.message)
        summaries.push({ tripId: trip.id, health: 'warning', budgetStatus: 'none', issueCount: 0, errorCount: 0, warningCount: 0 })
      }
    }
    res.json(summaries)
  } catch (error) {
    console.error('Error building consistency summary:', error)
    res.status(500).json({ error: 'Failed to build consistency summary' })
  }
})

// GET all trips with details
router.get('/', async (req, res) => {
  try {
    const trips = await Trip.findAll()
    res.json(trips)
  } catch (error) {
    console.error('Error fetching trips:', error)
    res.status(500).json({ error: 'Failed to fetch trips' })
  }
})

// GET trip consistency report
router.get('/:id/consistency', async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id)
    if (!trip) return res.status(404).json({ error: 'Trip not found' })

    const snapshot = await loadTripSnapshot(trip.id)
    if (!snapshot) return res.status(404).json({ error: 'Trip not found' })

    res.json(validateTripConsistency(snapshot))
  } catch (error) {
    console.error('Error building trip consistency:', error)
    res.status(500).json({ error: 'Failed to build trip consistency' })
  }
})

// GET trip map data (geographic view)
router.get('/:id/map-data', async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id)
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' })
    }

    const stages = await Stage.findAll({
      where: { tripId: trip.id },
      include: [{ model: Country, as: 'Country' }],
      order: [['startDate', 'ASC']]
    })

    const stageIds = stages.map((s) => s.id)
    const activities = stageIds.length
      ? await Activity.findAll({ where: { stageId: { [Op.in]: stageIds } } })
      : []

    const language = await getUserLanguage(req, 'en')
    const mapData = await buildTripMapData(trip, stages, activities, language)
    res.json(mapData)
  } catch (error) {
    console.error('Error building trip map:', error)
    res.status(500).json({ error: 'Failed to build trip map', details: error.message })
  }
})

// GET single trip
router.get('/:id', async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id)
    if (trip) {
      res.json(trip)
    } else {
      res.status(404).json({ error: 'Trip not found' })
    }
  } catch (error) {
    console.error('Error fetching trip:', error)
    res.status(500).json({ error: 'Failed to fetch trip' })
  }
})

// POST new trip
router.post('/', async (req, res) => {
  try {
    // Check if trip name already exists
    const existingTrip = await Trip.findOne({ where: { name: req.body.name } })
    if (existingTrip) {
      return res.status(400).json({ error: 'trip_name_exists' })
    }
    
    const trip = await Trip.create({
      ...req.body,
      ownerUserId: getUserId(req) || null
    })
    res.json(trip)
  } catch (error) {
    console.error('Error creating trip:', error)
    res.status(500).json({ error: 'Failed to create trip' })
  }
})

// PUT update trip
router.put('/:id', async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id)
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' })
    }
    
    // Check if trip name already exists (excluding current trip)
    if (req.body.name && req.body.name !== trip.name) {
      const existingTrip = await Trip.findOne({ 
        where: { 
          name: req.body.name,
          id: { [require('sequelize').Op.ne]: req.params.id }
        } 
      })
      if (existingTrip) {
        return res.status(400).json({ error: 'trip_name_exists' })
      }
    }
    
    await trip.update(req.body)
    res.json(trip)
  } catch (error) {
    console.error('Error updating trip:', error)
    res.status(500).json({ error: 'Failed to update trip' })
  }
})

// DELETE trip
router.delete('/:id', async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id)
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' })
    }

    // Count stages and activities to inform user
    const stages = await Stage.findAll({ where: { tripId: req.params.id } })
    let totalActivities = 0
    
    for (const stage of stages) {
      const activities = await Activity.findAll({ where: { stageId: stage.id } })
      totalActivities += activities.length
    }

    // Delete all activities first
    for (const stage of stages) {
      await Activity.destroy({ where: { stageId: stage.id } })
    }

    // Delete all stages
    await Stage.destroy({ where: { tripId: req.params.id } })

    // Delete the trip
    await trip.destroy()

    const message = `Voyage "${trip.name}" supprimé avec succès. ${stages.length} étape(s) et ${totalActivities} activité(s) ont également été supprimées.`
    
    res.json({ message })
  } catch (error) {
    console.error('Error deleting trip:', error)
    res.status(500).json({ error: 'Failed to delete trip' })
  }
})

const updateTripFromFirstRow = async (TripModel, tripId, headers, firstRowValues) => {
  const firstRowData = rowToObject(headers, firstRowValues)
  const trip = await TripModel.findByPk(tripId)
  if (!trip) return

  await trip.update({
    description: firstRowData['Trip Description'] || trip.description,
    startDate: parseCSVDate(firstRowData['Trip Start Date']) || trip.startDate,
    endDate: parseCSVDate(firstRowData['Trip End Date']) || trip.endDate,
    budget: firstRowData['Trip Budget'] ? Number.parseFloat(firstRowData['Trip Budget']) : trip.budget,
    currency: firstRowData['Trip Currency'] || trip.currency
  })
}

const parseCsvActivities = async (ActivityTypeModel, headers, rows) => {
  const allActivities = []
  const hotelGroups = new Map()
  const warnings = []

  for (let i = 0; i < rows.length; i++) {
    const values = parseCSVLine(rows[i])
    if (values.length < headers.length) continue

    const data = rowToObject(headers, values)
    if (!data['Activity Name']) continue

    const activityType = await ActivityTypeModel.findOne({ where: { label: data['Activity Type'] } })
    if (!activityType) {
      const msg = `Row ${i + 2}: unknown activity type "${data['Activity Type']}" for "${data['Activity Name']}" - skipped`
      console.warn(`[CSV Import] ${msg}`)
      warnings.push(msg)
      continue
    }

    const timezone = data['Stage Timezone'] || 'UTC'
    if (activityType.id === 7) {
      updateHotelGroup(hotelGroups, data, timezone)
      continue
    }

    const startDateTime = parseCSVDate(data['Activity Start DateTime'], timezone)
    if (startDateTime) {
      allActivities.push(buildNonHotelActivity(data, activityType, timezone))
    }
  }

  allActivities.push(...hotelGroupsToActivities(hotelGroups))
  allActivities.sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime())

  return { allActivities, warnings, hotelCount: hotelGroups.size }
}

const importStagesToDatabase = async (models, tripId, finalStages, fallbackCountry) => {
  let importedStages = 0
  let importedActivities = 0

  for (const stageData of finalStages) {
    const stageCountry = await models.Country.findOne({ where: { name: 'South Africa' } }) || fallbackCountry
    const stage = await models.Stage.create({
      name: stageData.name,
      tripId: Number.parseInt(tripId, 10),
      countryId: stageCountry ? stageCountry.id : null,
      startDate: stageData.startDate,
      endDate: stageData.endDate
    })
    importedStages++

    for (const activityData of stageData.activities) {
      await models.Activity.create(activityToRecord(activityData, stage.id))
      importedActivities++
    }
  }

  return { importedStages, importedActivities }
}

// POST import CSV
router.post('/:id/import-csv', async (req, res) => {
  try {
    const { csvContent } = req.body
    const tripId = req.params.id
    const warnings = []

    logger.info('[CSV Import] starting import')
    if (!csvContent) {
      return res.status(400).json({ error: 'CSV content is required' })
    }

    const lines = csvContent.split('\n').filter((line) => line.trim())
    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV file is empty or invalid' })
    }

    const headers = parseCSVLine(lines[0])
    const rows = lines.slice(1)
    logger.infoWithCounts('[CSV Import] data rows', rows.length)

    if (rows.length > 0) {
      await updateTripFromFirstRow(Trip, tripId, headers, parseCSVLine(rows[0]))
    }

    const { allActivities, warnings: rowWarnings, hotelCount } = await parseCsvActivities(ActivityType, headers, rows)
    warnings.push(...rowWarnings)
    logger.infoWithCounts('[CSV Import] activities to import', allActivities.length, hotelCount)

    const country = await Country.findOne({ where: { name: 'South Africa' } })
      || await Country.findOne({ where: { code: 'ZA' } })
    const finalStages = groupActivitiesIntoStages(allActivities)
    const { importedStages, importedActivities } = await importStagesToDatabase(
      { Stage, Activity, Country },
      tripId,
      finalStages,
      country
    )

    logger.infoWithCounts('[CSV Import] done', importedStages, importedActivities, warnings.length)
    res.json({
      message: `CSV imported successfully: ${importedStages} stages, ${importedActivities} activities`,
      importedStages,
      importedActivities,
      warnings
    })
  } catch (error) {
    console.error('[CSV Import] Fatal error:', error)
    res.status(500).json({ error: 'Failed to import CSV', details: error.message })
  }
})

module.exports = router