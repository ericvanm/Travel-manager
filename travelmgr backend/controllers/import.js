const router = require('express').Router()
const { Trip, Stage, Activity, Flight, Lodging, CarRental, Country } = require('../models/DBmodels')

// Parse ICS content
const parseICS = (icsContent) => {
  const events = []
  const lines = icsContent.split('\n')
  let currentEvent = {}
  let inEvent = false

  for (let line of lines) {
    line = line.trim()
    
    if (line === 'BEGIN:VEVENT') {
      inEvent = true
      currentEvent = {}
    } else if (line === 'END:VEVENT') {
      inEvent = false
      events.push(currentEvent)
    } else if (inEvent) {
      const [key, ...valueParts] = line.split(':')
      const value = valueParts.join(':').replace(/\\,/g, ',').replace(/\\n/g, '\n')
      
      if (key.includes(';')) {
        const [mainKey] = key.split(';')
        currentEvent[mainKey] = value
      } else {
        currentEvent[key] = value
      }
    }
  }
  
  return events
}

// Parse ICS date format
const parseICSDate = (dateStr) => {
  if (!dateStr) return null
  
  try {
    // Handle VALUE=DATE format (YYYYMMDD)
    if (dateStr.length === 8 && /^\d{8}$/.test(dateStr)) {
      const year = dateStr.substring(0, 4)
      const month = dateStr.substring(4, 6)
      const day = dateStr.substring(6, 8)
      return new Date(`${year}-${month}-${day}`)
    }
    
    // Handle datetime format (YYYYMMDDTHHMMSSZ)
    if (dateStr.includes('T')) {
      const isoString = dateStr.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/, '$1-$2-$3T$4:$5:$6Z')
      const date = new Date(isoString)
      return isNaN(date.getTime()) ? null : date
    }
    
    return null
  } catch (error) {
    console.error('Date parsing error:', error, dateStr)
    return null
  }
}

// Extract trip info from main event
const extractTripInfo = (events) => {
  const mainEvent = events.find(e => e.SUMMARY && e.SUMMARY.includes('Cape Town') && e.DTSTART && e.DTEND)
  if (!mainEvent) return null
  
  return {
    name: mainEvent.SUMMARY.replace(/\\,/g, ','),
    description: mainEvent.DESCRIPTION ? mainEvent.DESCRIPTION.split('\\n')[0] : '',
    startDate: parseICSDate(mainEvent.DTSTART),
    endDate: parseICSDate(mainEvent.DTEND),
    location: mainEvent.LOCATION ? mainEvent.LOCATION.replace(/\\,/g, ',') : ''
  }
}

// Group events by location/stage
const groupEventsByStage = (events) => {
  const stages = new Map()
  
  events.forEach(event => {
    if (event.SUMMARY && event.SUMMARY !== events[0].SUMMARY) {
      const location = event.LOCATION || 'Unknown'
      const city = location.split(',')[0] || location
      
      if (!stages.has(city)) {
        stages.set(city, {
          name: city,
          activities: []
        })
      }
      
      stages.get(city).activities.push(event)
    }
  })
  
  return Array.from(stages.values())
}

// Convert ICS event to activity
const convertToActivity = (event) => {
  const summary = event.SUMMARY || ''
  
  // Flight
  if (summary.includes('to') && (summary.includes('KL') || summary.includes('FA'))) {
    return {
      type: 'flight',
      name: summary,
      activityTypeId: 6,
      startDateTime: parseICSDate(event.DTSTART),
      endDateTime: parseICSDate(event.DTEND),
      airline: summary.includes('KL') ? 'KLM' : 'Safair',
      flightNumber: summary.split(' ')[0],
      departureAirport: summary.split(' ')[1],
      arrivalAirport: summary.split(' ')[3]
    }
  }
  
  // Hotel/Lodging
  if (summary.includes('Check-in:') || summary.includes('Check-out:')) {
    const startDate = parseICSDate(event.DTSTART)
    const endDate = parseICSDate(event.DTEND)
    return {
      type: 'lodging',
      name: summary.replace('Check-in: ', '').replace('Check-out: ', ''),
      activityTypeId: 7,
      startDateTime: startDate,
      endDateTime: endDate,
      address: event.LOCATION,
      checkInDate: startDate,
      checkOutDate: endDate
    }
  }
  
  // Car Rental
  if (summary.includes('Rental Car') || summary.includes('Pick Up') || summary.includes('Drop Off')) {
    return {
      type: 'car_rental',
      name: summary,
      activityTypeId: 8,
      startDateTime: parseICSDate(event.DTSTART),
      endDateTime: parseICSDate(event.DTEND),
      company: 'Europcar',
      pickupLocation: summary.includes('Pick Up') ? event.LOCATION : null,
      dropoffLocation: summary.includes('Drop Off') ? event.LOCATION : null
    }
  }
  
  // Default activity
  return {
    type: 'activity',
    name: summary,
    activityTypeId: 1,
    startDateTime: parseICSDate(event.DTSTART),
    endDateTime: parseICSDate(event.DTEND),
    city: event.LOCATION ? event.LOCATION.split(',')[0] : null
  }
}

// POST import ICS file
router.post('/', async (req, res) => {
  try {
    const { icsContent, userId } = req.body
    
    if (!icsContent) {
      return res.status(400).json({ error: 'ICS content is required' })
    }
    
    // Parse ICS
    const events = parseICS(icsContent)
    const tripInfo = extractTripInfo(events)
    
    if (!tripInfo) {
      return res.status(400).json({ error: 'Could not extract trip information' })
    }
    
    // Create trip
    const trip = await Trip.create({
      name: tripInfo.name,
      description: tripInfo.description,
      startDate: tripInfo.startDate,
      endDate: tripInfo.endDate,
      userId: userId || 1 // Default user
    })
    
    // Group events by stages
    const stageGroups = groupEventsByStage(events)
    
    // Find South Africa country
    const southAfrica = await Country.findOne({ where: { code: 'ZA' } })
    
    for (const stageGroup of stageGroups) {
      // Calculate stage dates from activities
      const activityDates = stageGroup.activities
        .map(event => parseICSDate(event.DTSTART))
        .filter(date => date !== null)
      
      const stageStartDate = activityDates.length > 0 ? new Date(Math.min(...activityDates.map(d => d.getTime()))) : null
      const stageEndDate = activityDates.length > 0 ? new Date(Math.max(...activityDates.map(d => d.getTime()))) : null
      
      // Create stage with calculated dates
      const stage = await Stage.create({
        name: stageGroup.name,
        tripId: trip.id,
        countryId: southAfrica ? southAfrica.id : null,
        startDate: stageStartDate,
        endDate: stageEndDate
      })
      
      // Create activities for this stage
      for (const event of stageGroup.activities) {
        const activityData = convertToActivity(event)
        
        if (activityData.type === 'flight' && activityData.startDateTime && activityData.endDateTime) {
          await Flight.create({
            stageId: stage.id,
            airline: activityData.airline,
            flightNumber: activityData.flightNumber,
            departureAirport: activityData.departureAirport,
            arrivalAirport: activityData.arrivalAirport,
            departureTime: activityData.startDateTime,
            arrivalTime: activityData.endDateTime,
            cost: null
          })
        // Skip specialized tables for now - only create generic activities
        // } else if (activityData.type === 'lodging') {
        //   await Lodging.create({
        //     stageId: stage.id,
        //     name: activityData.name,
        //     address: activityData.address,
        //     checkInDate: activityData.checkInDate,
        //     checkOutDate: activityData.checkOutDate,
        //     totalCost: null
        //   })
        // } else if (activityData.type === 'car_rental') {
        //   await CarRental.create({
        //     stageId: stage.id,
        //     company: activityData.company,
        //     pickupLocation: activityData.pickupLocation,
        //     dropoffLocation: activityData.dropoffLocation,
        //     pickupDate: activityData.startDateTime,
        //     dropoffDate: activityData.endDateTime,
        //     totalCost: null
        //   })
        }
        
        // Create generic activity with hotel-specific fields if applicable
        const activityCreateData = {
          name: activityData.name,
          stageId: stage.id,
          activityTypeId: activityData.activityTypeId,
          startDateTime: activityData.startDateTime,
          endDateTime: activityData.endDateTime,
          city: activityData.city,
          cost: null
        }

        // Add hotel-specific fields for lodging activities
        if (activityData.activityTypeId === 7) {
          activityCreateData.checkInDate = activityData.checkInDate
          activityCreateData.checkOutDate = activityData.checkOutDate
          activityCreateData.address = activityData.address
        }

        await Activity.create(activityCreateData)
      }
    }
    
    res.json({ 
      message: 'Trip imported successfully',
      tripId: trip.id,
      stagesCreated: stageGroups.length
    })
    
  } catch (error) {
    console.error('Import error:', error)
    res.status(500).json({ error: 'Failed to import trip' })
  }
})

module.exports = router