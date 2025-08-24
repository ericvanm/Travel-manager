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

// Helper function to parse CSV properly
const parseCSVLine = (line) => {
  const result = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result
}

// Helper function to parse date in various formats
const parseCSVDate = (dateStr, timezone = 'UTC') => {
  if (!dateStr || dateStr.trim() === '') return null
  
  try {
    // Handle ISO format (YYYY-MM-DDTHH:MM:SS.sssZ)
    if (dateStr.includes('T') && (dateStr.endsWith('Z') || dateStr.includes('+') || dateStr.includes('-'))) {
      return new Date(dateStr)
    }
    
    // Handle DD/MM/YYYY HH:MM:SS format (legacy)
    if (dateStr.includes(' ')) {
      const [datePart, timePart] = dateStr.split(' ')
      if (datePart.includes('/')) {
        const [day, month, year] = datePart.split('/')
        const isoString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timePart}`
        
        // Convert from local timezone to UTC
        if (timezone === 'Africa/Johannesburg') {
          // SAST = UTC+2
          const localDate = new Date(isoString)
          return new Date(localDate.getTime() - (2 * 60 * 60 * 1000))
        } else {
          // Default to UTC
          return new Date(isoString + 'Z')
        }
      }
    }
    
    // Handle DD/MM/YYYY format (legacy)
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/')
      return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
    }
    
    // Handle YYYY-MM-DD format
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // For date-only format, assume it's in the local timezone
      if (timezone === 'Africa/Johannesburg') {
        // Create date at midnight in SAST, then convert to UTC
        const localDate = new Date(dateStr + 'T00:00:00')
        return new Date(localDate.getTime() - (2 * 60 * 60 * 1000))
      }
      return new Date(dateStr + 'T00:00:00Z')
    }
    
    return new Date(dateStr)
  } catch (error) {
    console.error('Date parsing error:', error, dateStr)
    return null
  }
}

// POST import CSV
router.post('/:id/import-csv', async (req, res) => {
  try {
    const { csvContent } = req.body
    const tripId = req.params.id
    
    console.log('Starting CSV import for trip:', tripId)
    
    // Parse CSV
    const lines = csvContent.split('\n').filter(line => line.trim())
    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV file is empty or invalid' })
    }
    
    const headers = parseCSVLine(lines[0])
    const rows = lines.slice(1)
    
    console.log('CSV headers:', headers)
    console.log('CSV rows count:', rows.length)
    
    // Update trip information from first row
    if (rows.length > 0) {
      const firstRowValues = parseCSVLine(rows[0])
      const firstRowData = {}
      headers.forEach((header, index) => {
        firstRowData[header] = firstRowValues[index] || ''
      })
      
      const trip = await Trip.findByPk(tripId)
      if (trip) {
        await trip.update({
          description: firstRowData['Trip Description'] || trip.description,
          startDate: parseCSVDate(firstRowData['Trip Start Date']) || trip.startDate,
          endDate: parseCSVDate(firstRowData['Trip End Date']) || trip.endDate,
          budget: firstRowData['Trip Budget'] ? parseFloat(firstRowData['Trip Budget']) : trip.budget,
          currency: firstRowData['Trip Currency'] || trip.currency
        })
        console.log('Updated trip information')
      }
    }
    
    // Parse all activities from CSV
    const allActivities = []
    const hotelGroups = new Map()
    
    for (let i = 0; i < rows.length; i++) {
      const values = parseCSVLine(rows[i])
      if (values.length < headers.length) continue
      
      const data = {}
      headers.forEach((header, index) => {
        data[header] = values[index] || ''
      })
      
      if (!data['Activity Name']) continue
      
      const activityType = await ActivityType.findOne({ where: { label: data['Activity Type'] } })
      if (!activityType) continue
      
      const timezone = data['Stage Timezone'] || 'UTC'
      const startDateTime = parseCSVDate(data['Activity Start DateTime'], timezone)
      const endDateTime = parseCSVDate(data['Activity End DateTime'], timezone)
      const checkInDate = parseCSVDate(data['Check-in Date'], timezone)
      const checkOutDate = parseCSVDate(data['Check-out Date'], timezone)
      
      // Group hotel check-in/check-out events
      if (activityType.id === 7) {
        const hotelName = data['Activity Name']
        if (!hotelGroups.has(hotelName)) {
          hotelGroups.set(hotelName, { 
            checkIn: null, 
            checkOut: null, 
            address: data['Hotel Address'],
            phone: data['Hotel Phone'],
            roomType: data['Room Type'],
            confirmationNumber: data['Confirmation Number'],
            stageName: data['Stage Name']
          })
        }
        
        const hotel = hotelGroups.get(hotelName)
        if (checkInDate || startDateTime) {
          hotel.checkIn = checkInDate || startDateTime
        }
        if (checkOutDate || endDateTime) {
          hotel.checkOut = checkOutDate || endDateTime
        }
      } else {
        // Non-hotel activities
        if (startDateTime) {
          allActivities.push({
            name: data['Activity Name'],
            activityTypeId: activityType.id,
            startDateTime,
            endDateTime,
            stageName: data['Stage Name'],
            city: data['Activity City'],
            cost: data['Activity Cost'] ? parseFloat(data['Activity Cost']) : null,
            // Flight fields
            airline: data['Airline'],
            flightNumber: data['Flight Number'],
            departureAirport: data['Departure Airport'],
            arrivalAirport: data['Arrival Airport'],
            seat: data['Seat'],
            gate: data['Gate'],
            terminal: data['Terminal'],
            // Car rental fields
            company: data['Car Company'],
            pickupLocation: data['Pickup Location'],
            dropoffLocation: data['Dropoff Location'],
            pickupDate: parseCSVDate(data['Pickup Date'], timezone),
            dropoffDate: parseCSVDate(data['Dropoff Date'], timezone),
            carType: data['Car Type'],
            confirmationNumber: data['Confirmation Number']
          })
        }
      }
    }
    
    // Add merged hotel activities
    for (const [hotelName, hotel] of hotelGroups) {
      if (hotel.checkIn) {
        allActivities.push({
          name: hotelName,
          activityTypeId: 7,
          startDateTime: hotel.checkIn,
          endDateTime: hotel.checkOut,
          stageName: hotel.stageName,
          address: hotel.address,
          phone: hotel.phone,
          checkInDate: hotel.checkIn,
          checkOutDate: hotel.checkOut,
          roomType: hotel.roomType,
          confirmationNumber: hotel.confirmationNumber
        })
      }
    }
    
    // Sort all activities by date
    allActivities.sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime())
    
    // Group activities into non-overlapping stages
    const finalStages = []
    let currentStage = null
    
    // Find country
    let country = await Country.findOne({ where: { name: 'South Africa' } })
    if (!country) {
      country = await Country.findOne({ where: { code: 'ZA' } })
    }
    
    for (const activity of allActivities) {
      if (!currentStage || activity.stageName !== currentStage.name) {
        // Start new stage
        if (currentStage) {
          finalStages.push(currentStage)
        }
        currentStage = {
          name: activity.stageName,
          activities: [activity],
          startDate: activity.startDateTime,
          endDate: activity.endDateTime || activity.startDateTime
        }
      } else {
        // Add to current stage
        currentStage.activities.push(activity)
        if (activity.endDateTime && activity.endDateTime > currentStage.endDate) {
          currentStage.endDate = activity.endDateTime
        }
      }
    }
    
    // Add the last stage
    if (currentStage) {
      finalStages.push(currentStage)
    }
    
    let importedStages = 0
    let importedActivities = 0
    
    // Create stages in database
    for (const stageData of finalStages) {
      // Find the country with timezone for this stage
      const stageCountry = await Country.findOne({ where: { name: 'South Africa' } }) || country
      
      const stage = await Stage.create({
        name: stageData.name,
        tripId: parseInt(tripId),
        countryId: stageCountry ? stageCountry.id : null,
        startDate: stageData.startDate,
        endDate: stageData.endDate
      })
      importedStages++
      
      // Create activities for this stage
      for (const activityData of stageData.activities) {
        await Activity.create({
          name: activityData.name,
          stageId: stage.id,
          activityTypeId: activityData.activityTypeId,
          startDateTime: activityData.startDateTime,
          endDateTime: activityData.endDateTime,
          city: activityData.city,
          cost: activityData.cost,
          // Flight fields
          airline: activityData.airline,
          flightNumber: activityData.flightNumber,
          departureAirport: activityData.departureAirport,
          arrivalAirport: activityData.arrivalAirport,
          seat: activityData.seat,
          gate: activityData.gate,
          terminal: activityData.terminal,
          // Hotel fields
          address: activityData.address,
          phone: activityData.phone,
          checkInDate: activityData.checkInDate,
          checkOutDate: activityData.checkOutDate,
          roomType: activityData.roomType,
          confirmationNumber: activityData.confirmationNumber,
          // Car rental fields
          company: activityData.company,
          pickupLocation: activityData.pickupLocation,
          dropoffLocation: activityData.dropoffLocation,
          pickupDate: activityData.pickupDate,
          dropoffDate: activityData.dropoffDate,
          carType: activityData.carType
        })
        importedActivities++
      }
    }
    
    console.log(`Import completed: ${importedStages} stages, ${importedActivities} activities`)
    
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