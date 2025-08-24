const router = require('express').Router()
const { Trip, Stage, Activity, Transport, Accommodation, Expense, Country, ActivityType } = require('../models/DBmodels')

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
    const trip = await Trip.create(req.body)
    res.json(trip)
  } catch (error) {
    console.error('Error creating trip:', error)
    res.status(500).json({ error: 'Failed to create trip' })
  }
})

// PUT update trip
router.put('/:id', async (req, res) => {
  const trip = await Trip.findByPk(req.params.id)
  if (trip) {
    await trip.update(req.body)
    res.json(trip)
  } else {
    res.status(404).json({ error: 'Trip not found' })
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

// POST import CSV
router.post('/:id/import-csv', async (req, res) => {
  try {
    const { csvContent } = req.body
    const tripId = req.params.id
    
    // Parse CSV
    const lines = csvContent.split('\n').filter(line => line.trim())
    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV file is empty or invalid' })
    }
    
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
    const rows = lines.slice(1)
    
    let importedStages = 0
    let importedActivities = 0
    const stageMap = new Map()
    
    for (const row of rows) {
      const values = row.split(',').map(v => v.replace(/"/g, '').trim())
      if (values.length < headers.length) continue
      
      const data = {}
      headers.forEach((header, index) => {
        data[header] = values[index] || ''
      })
      
      // Create or find stage
      let stage
      const stageKey = `${data['Stage Name']}_${data['Stage Country']}`
      if (stageMap.has(stageKey)) {
        stage = stageMap.get(stageKey)
      } else {
        const { Country, ActivityType } = require('../models/DBmodels')
        const country = await Country.findOne({ where: { name: data['Stage Country'] } })
        if (country) {
          stage = await Stage.create({
            tripId: parseInt(tripId),
            countryId: country.id,
            name: data['Stage Name'],
            startDate: data['Stage Start Date'] ? new Date(data['Stage Start Date']) : null,
            endDate: data['Stage End Date'] ? new Date(data['Stage End Date']) : null
          })
          stageMap.set(stageKey, stage)
          importedStages++
        }
      }
      
      // Create activity if data exists
      if (stage && data['Activity Name']) {
        const { ActivityType } = require('../models/DBmodels')
        const activityType = await ActivityType.findOne({ where: { label: data['Activity Type'] } })
        if (activityType) {
          const activityData = {
            stageId: stage.id,
            activityTypeId: activityType.id,
            name: data['Activity Name'],
            startDateTime: data['Activity Start DateTime'] ? new Date(data['Activity Start DateTime']) : null,
            endDateTime: data['Activity End DateTime'] ? new Date(data['Activity End DateTime']) : null,
            city: data['Activity City'] || null,
            cost: data['Activity Cost'] ? parseFloat(data['Activity Cost']) : null
          }
          
          // Add flight-specific fields
          if (activityType.id === 6) {
            activityData.airline = data['Airline'] || null
            activityData.flightNumber = data['Flight Number'] || null
            activityData.departureAirport = data['Departure Airport'] || null
            activityData.arrivalAirport = data['Arrival Airport'] || null
            activityData.seat = data['Seat'] || null
            activityData.gate = data['Gate'] || null
            activityData.terminal = data['Terminal'] || null
          }
          
          // Add hotel-specific fields
          if (activityType.id === 7) {
            activityData.address = data['Hotel Address'] || null
            activityData.phone = data['Hotel Phone'] || null
            activityData.checkInDate = data['Check-in Date'] ? new Date(data['Check-in Date']) : null
            activityData.checkOutDate = data['Check-out Date'] ? new Date(data['Check-out Date']) : null
            activityData.roomType = data['Room Type'] || null
            activityData.confirmationNumber = data['Confirmation Number'] || null
          }
          
          await Activity.create(activityData)
          importedActivities++
        }
      }
    }
    
    res.json({ 
      message: `CSV imported successfully: ${importedStages} stages, ${importedActivities} activities`,
      importedStages,
      importedActivities
    })
  } catch (error) {
    console.error('Error importing CSV:', error)
    res.status(500).json({ error: 'Failed to import CSV', details: error.message })
  }
})

module.exports = router