const router = require('express').Router()
const { Trip, Stage, Activity, Transport, Accommodation, Expense, Country, ActivityType } = require('../models/DBmodels')
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
    
    const trip = await Trip.create(req.body)
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
    budget: firstRowData['Trip Budget'] ? parseFloat(firstRowData['Trip Budget']) : trip.budget,
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
      tripId: parseInt(tripId, 10),
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

    console.log(`[CSV Import] Trip ${tripId} - starting import`)
    if (!csvContent) {
      return res.status(400).json({ error: 'CSV content is required' })
    }

    const lines = csvContent.split('\n').filter((line) => line.trim())
    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV file is empty or invalid' })
    }

    const headers = parseCSVLine(lines[0])
    const rows = lines.slice(1)
    console.log(`[CSV Import] Data rows: ${rows.length}`)

    if (rows.length > 0) {
      await updateTripFromFirstRow(Trip, tripId, headers, parseCSVLine(rows[0]))
    }

    const { allActivities, warnings: rowWarnings, hotelCount } = await parseCsvActivities(ActivityType, headers, rows)
    warnings.push(...rowWarnings)
    console.log(`[CSV Import] Activities to import: ${allActivities.length} (hotels merged: ${hotelCount})`)

    const country = await Country.findOne({ where: { name: 'South Africa' } })
      || await Country.findOne({ where: { code: 'ZA' } })
    const finalStages = groupActivitiesIntoStages(allActivities)
    const { importedStages, importedActivities } = await importStagesToDatabase(
      { Stage, Activity, Country },
      tripId,
      finalStages,
      country
    )

    console.log(`[CSV Import] Done: ${importedStages} stages, ${importedActivities} activities, ${warnings.length} warnings`)
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