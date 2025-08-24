const router = require('express').Router()
const { Trip, Stage, Activity, Flight, Lodging, CarRental, Country } = require('../models/DBmodels')

// Parse ICS content
const parseICS = (icsContent) => {
  console.log('ICS Content length:', icsContent.length)
  console.log('First 200 chars:', icsContent.substring(0, 200))
  
  const events = []
  const lines = icsContent.split('\n')
  let currentEvent = {}
  let inEvent = false
  let currentKey = null
  let eventCount = 0

  for (let line of lines) {
    if (line.trim() === 'BEGIN:VEVENT') {
      inEvent = true
      currentEvent = {}
      currentKey = null
      eventCount++
      console.log('Starting event', eventCount)
    } else if (line.trim() === 'END:VEVENT') {
      inEvent = false
      events.push(currentEvent)
      currentKey = null
      console.log('Ending event', eventCount, 'SUMMARY:', currentEvent.SUMMARY)
    } else if (inEvent) {
      // Handle line continuation (starts with space or tab)
      if (line.startsWith(' ') || line.startsWith('\t')) {
        if (currentKey && currentEvent[currentKey]) {
          currentEvent[currentKey] += line.substring(1)
        }
      } else {
        line = line.trim()
        const [key, ...valueParts] = line.split(':')
        const value = valueParts.join(':').replace(/\\,/g, ',').replace(/\\n/g, '\n')
        
        if (key.includes(';')) {
          const [mainKey] = key.split(';')
          currentEvent[mainKey] = value
          currentKey = mainKey
        } else {
          currentEvent[key] = value
          currentKey = key
        }
      }
    }
  }
  
  console.log('Total events parsed:', events.length)
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

// Extract trip info from main event and ICS metadata
const extractTripInfo = (events, icsContent) => {
  console.log('Events found:', events.length)
  events.forEach((e, i) => console.log(`Event ${i}:`, e.SUMMARY))
  
  const mainEvent = events.find(e => e.SUMMARY && e.DTSTART && e.DTEND && e.DTSTART.length === 8)
  console.log('Main event found:', mainEvent ? mainEvent.SUMMARY : 'None')
  if (!mainEvent) return null
  
  // Extract X-WR-CALDESC from ICS content
  const caldescMatch = icsContent.match(/X-WR-CALDESC:(.+)/)
  const caldescValue = caldescMatch ? caldescMatch[1].replace(/\\,/g, ',').trim() : ''
  
  return {
    name: mainEvent.SUMMARY.replace(/\\,/g, ','),
    description: caldescValue || (mainEvent.DESCRIPTION ? mainEvent.DESCRIPTION.split('\\n')[0] : ''),
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
  const description = event.DESCRIPTION || ''
  console.log('Processing flight description:', description)
  // Flight - detect by DESCRIPTION containing Terminal, [Flight], Gate
  if (description.includes('Terminal') && description.includes('[Flight]') && description.includes('Gate')) {
    const flightMatch = description.match(/\[Flight\]\s+([A-Z]{3}\s+to\s+[A-Z]{3})/)
    const flightInfo = flightMatch ? flightMatch[1].trim() : summary
    const flightNumberMatch = description.match(/([A-Z]{2,3}\s+\d+)/)
    const flightNumber = flightNumberMatch ? flightNumberMatch[1] : ''
    
    return {
      type: 'flight',
      name: flightInfo,
      activityTypeId: 6,
      startDateTime: parseICSDate(event.DTSTART),
      endDateTime: parseICSDate(event.DTEND),
      flightNumber: flightNumber
    }
  }
  
  // Hotel/Lodging
  if (summary.includes('Check-in:') || summary.includes('Check-out:')) {
    const dateTime = parseICSDate(event.DTSTART)
    const cleanAddress = event.LOCATION ? event.LOCATION.replace(/\\,/g, ',').replace(/\\/g, '') : ''
    
    return {
      type: 'lodging',
      name: summary.replace('Check-in: ', '').replace('Check-out: ', ''),
      activityTypeId: 7,
      startDateTime: dateTime,
      endDateTime: dateTime,
      address: cleanAddress,
      checkInDate: summary.includes('Check-in:') ? dateTime : null,
      checkOutDate: summary.includes('Check-out:') ? dateTime : null
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
    const { icsContent, userId, tripId, tripName } = req.body
    
    if (!icsContent) {
      return res.status(400).json({ error: 'ICS content is required' })
    }
    
    // Parse ICS
    const events = parseICS(icsContent)
    const tripInfo = extractTripInfo(events, icsContent)
    
    if (!tripInfo) {
      return res.status(400).json({ error: 'Could not extract trip information' })
    }
    
    // Use existing trip or create new one
    let trip
    if (tripId) {
      trip = await Trip.findByPk(tripId)
      if (!trip) {
        return res.status(404).json({ error: 'Trip not found' })
      }
      // Update trip with ICS data
      await trip.update({
        description: tripInfo.description,
        startDate: tripInfo.startDate,
        endDate: tripInfo.endDate
      })
    } else {
      trip = await Trip.create({
        name: tripName || tripInfo.name,
        description: tripInfo.description,
        startDate: tripInfo.startDate,
        endDate: tripInfo.endDate,
        userId: userId || 1
      })
    }
    
    // Group events by stages
    const stageGroups = groupEventsByStage(events)
    
    // Find South Africa country
    const southAfrica = await Country.findOne({ where: { code: 'ZA' } })
    
    // Collect all activities with their dates and stage info
    const allActivities = []
    stageGroups.forEach(stageGroup => {
      stageGroup.activities.forEach(event => {
        const eventDate = parseICSDate(event.DTSTART)
        if (eventDate) {
          allActivities.push({
            event,
            date: eventDate,
            stageName: stageGroup.name
          })
        }
      })
    })
    
    // Sort all activities by date
    allActivities.sort((a, b) => a.date.getTime() - b.date.getTime())
    
    // Group activities into non-overlapping stages
    const finalStages = []
    let currentStage = null
    let stageCounter = 1
    
    for (const activity of allActivities) {
      if (!currentStage || activity.stageName !== currentStage.name) {
        // Start new stage
        if (currentStage) {
          finalStages.push(currentStage)
        }
        currentStage = {
          name: activity.stageName,
          activities: [activity.event],
          startDate: activity.date,
          endDate: activity.date
        }
      } else {
        // Add to current stage
        currentStage.activities.push(activity.event)
        currentStage.endDate = activity.date
      }
    }
    
    // Add the last stage
    if (currentStage) {
      finalStages.push(currentStage)
    }
    
    // Create stages in database
    for (const stageData of finalStages) {
      const stage = await Stage.create({
        name: stageData.name,
        tripId: trip.id,
        countryId: southAfrica ? southAfrica.id : null,
        startDate: stageData.startDate,
        endDate: stageData.endDate
      })
      
      await processStageActivities(stage, stageData.activities)
    }
    
    // Helper function to process activities for a stage
    async function processStageActivities(stage, activities) {
      // Group hotel check-in/check-out events
      const hotelGroups = new Map()
      const otherActivities = []
      
      for (const event of activities) {
        const activityData = convertToActivity(event)
        
        if (activityData.type === 'lodging') {
          const hotelName = activityData.name
          if (!hotelGroups.has(hotelName)) {
            hotelGroups.set(hotelName, { checkIn: null, checkOut: null, address: activityData.address })
          }
          
          const hotel = hotelGroups.get(hotelName)
          if (event.SUMMARY.includes('Check-in:')) {
            hotel.checkIn = activityData
            hotel.address = activityData.address
          } else if (event.SUMMARY.includes('Check-out:')) {
            hotel.checkOut = activityData
            if (!hotel.address) hotel.address = activityData.address
          }
        } else {
          otherActivities.push({ event, activityData })
        }
      }
      
      // Create merged hotel activities
      for (const [hotelName, hotel] of hotelGroups) {
        const checkInDateTime = hotel.checkIn?.checkInDate || hotel.checkIn?.startDateTime
        const checkOutDateTime = hotel.checkOut?.checkOutDate || hotel.checkOut?.endDateTime
        
        await Activity.create({
          name: hotelName,
          stageId: stage.id,
          activityTypeId: 7,
          startDateTime: checkInDateTime,
          endDateTime: checkOutDateTime,
          checkInDate: checkInDateTime,
          checkOutDate: checkOutDateTime,
          address: hotel.address,
          city: null,
          cost: null
        })
      }
      
      // Create other activities
      for (const { event, activityData } of otherActivities) {
        await Activity.create({
          name: activityData.name,
          stageId: stage.id,
          activityTypeId: activityData.activityTypeId,
          startDateTime: activityData.startDateTime,
          endDateTime: activityData.endDateTime,
          city: activityData.city,
          cost: null
        })
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