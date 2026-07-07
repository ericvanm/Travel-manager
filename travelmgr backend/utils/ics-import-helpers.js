const parseICSDate = (dateStr) => {
  if (!dateStr) return null

  try {
    if (dateStr.length === 8 && /^\d{8}$/.test(dateStr)) {
      const year = dateStr.substring(0, 4)
      const month = dateStr.substring(4, 6)
      const day = dateStr.substring(6, 8)
      return new Date(`${year}-${month}-${day}`)
    }

    if (dateStr.includes('T')) {
      const isoString = dateStr.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/, '$1-$2-$3T$4:$5:$6Z')
      const date = new Date(isoString)
      return Number.isNaN(date.getTime()) ? null : date
    }

    return null
  } catch (error) {
    console.error('Date parsing error:', error, dateStr)
    return null
  }
}

const applyEventLine = (currentEvent, line) => {
  if (line.startsWith(' ') || line.startsWith('\t')) {
    const key = currentEvent._currentKey
    if (key && currentEvent[key]) {
      currentEvent[key] += line.substring(1)
    }
    return
  }

  const trimmed = line.trim()
  const [key, ...valueParts] = trimmed.split(':')
  const value = valueParts.join(':').replace(/\\,/g, ',').replace(/\\n/g, '\n')
  const mainKey = key.includes(';') ? key.split(';')[0] : key

  currentEvent[mainKey] = value
  currentEvent._currentKey = mainKey
}

const parseICS = (icsContent) => {
  const events = []
  const lines = icsContent.split('\n')
  let currentEvent = null

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    if (line.trim() === 'BEGIN:VEVENT') {
      currentEvent = { _currentKey: null }
      continue
    }
    if (line.trim() === 'END:VEVENT') {
      if (currentEvent) {
        delete currentEvent._currentKey
        events.push(currentEvent)
      }
      currentEvent = null
      continue
    }
    if (currentEvent) {
      applyEventLine(currentEvent, line)
    }
  }

  return events
}

const extractTripInfo = (events, icsContent) => {
  const mainEvent = events.find((event) => event.SUMMARY && event.DTSTART && event.DTEND && event.DTSTART.length === 8)
  if (!mainEvent) return null

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

const groupEventsByStage = (events) => {
  const stages = new Map()
  const mainSummary = events[0]?.SUMMARY

  events.forEach((event) => {
    if (!event.SUMMARY || event.SUMMARY === mainSummary) {
      return
    }

    const location = event.LOCATION || 'Unknown'
    const city = location.split(',')[0] || location

    if (!stages.has(city)) {
      stages.set(city, { name: city, activities: [] })
    }
    stages.get(city).activities.push(event)
  })

  return Array.from(stages.values())
}

const convertFlightEvent = (event, summary, description) => {
  const flightMatch = description.match(/\[Flight\]\s+([A-Z]{3}\s+to\s+[A-Z]{3})/)
  const flightNumberMatch = description.match(/([A-Z]{2,3}\s+\d+)/)

  return {
    type: 'flight',
    name: flightMatch ? flightMatch[1].trim() : summary,
    activityTypeId: 6,
    startDateTime: parseICSDate(event.DTSTART),
    endDateTime: parseICSDate(event.DTEND),
    flightNumber: flightNumberMatch ? flightNumberMatch[1] : ''
  }
}

const convertLodgingEvent = (event, summary) => {
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

const convertCarRentalEvent = (event, summary) => ({
  type: 'car_rental',
  name: summary,
  activityTypeId: 8,
  startDateTime: parseICSDate(event.DTSTART),
  endDateTime: parseICSDate(event.DTEND),
  company: 'Europcar',
  pickupLocation: summary.includes('Pick Up') ? event.LOCATION : null,
  dropoffLocation: summary.includes('Drop Off') ? event.LOCATION : null
})

const convertDefaultEvent = (event, summary) => ({
  type: 'activity',
  name: summary,
  activityTypeId: 1,
  startDateTime: parseICSDate(event.DTSTART),
  endDateTime: parseICSDate(event.DTEND),
  city: event.LOCATION ? event.LOCATION.split(',')[0] : null
})

const convertToActivity = (event) => {
  const summary = event.SUMMARY || ''
  const description = event.DESCRIPTION || ''

  if (description.includes('Terminal') && description.includes('[Flight]') && description.includes('Gate')) {
    return convertFlightEvent(event, summary, description)
  }
  if (summary.includes('Check-in:') || summary.includes('Check-out:')) {
    return convertLodgingEvent(event, summary)
  }
  if (summary.includes('Rental Car') || summary.includes('Pick Up') || summary.includes('Drop Off')) {
    return convertCarRentalEvent(event, summary)
  }
  return convertDefaultEvent(event, summary)
}

const isHotelSummary = (summary) => summary.includes('Check-in:') || summary.includes('Check-out:')
const isCarRentalSummary = (summary) => summary.includes('Rental Car') || summary.includes('Pick Up') || summary.includes('Drop Off')

const resolveStageName = (stageData) => {
  const hotelActivities = stageData.activities.filter((event) => isHotelSummary(event.SUMMARY || ''))
  const carRentalActivities = stageData.activities.filter((event) => isCarRentalSummary(event.SUMMARY || ''))

  if (hotelActivities.length > 0 && stageData.activities.length <= 2) {
    return hotelActivities[0].SUMMARY.replace('Check-in: ', '').replace('Check-out: ', '') || stageData.name
  }
  if (carRentalActivities.length > 0 && stageData.activities.length <= 2) {
    return carRentalActivities[0].SUMMARY || stageData.name
  }
  return stageData.name
}

const groupActivitiesIntoStages = (allActivities) => {
  const finalStages = []
  let currentStage = null

  for (const activity of allActivities) {
    if (!currentStage || activity.stageName !== currentStage.name) {
      if (currentStage) {
        finalStages.push(currentStage)
      }
      currentStage = {
        name: activity.stageName,
        activities: [activity.event],
        startDate: activity.date,
        endDate: activity.date
      }
      continue
    }

    currentStage.activities.push(activity.event)
    currentStage.endDate = activity.date
  }

  if (currentStage) {
    finalStages.push(currentStage)
  }

  return finalStages
}

const collectActivitiesFromStages = (stageGroups) => {
  const allActivities = []

  stageGroups.forEach((stageGroup) => {
    stageGroup.activities.forEach((event) => {
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

  return allActivities.sort((a, b) => a.date.getTime() - b.date.getTime())
}

const createHotelActivity = async (Activity, stage, hotelName, hotel) => {
  const checkInDateTime = hotel.checkIn?.checkInDate || hotel.checkIn?.startDateTime
  const checkOutDateTime = hotel.checkOut?.checkOutDate || hotel.checkOut?.startDateTime

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

const processStageActivities = async (Activity, stage, activities, convertActivity) => {
  const hotelGroups = new Map()
  const otherActivities = []

  for (const event of activities) {
    const activityData = convertActivity(event)
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
      continue
    }
    otherActivities.push({ event, activityData })
  }

  for (const [hotelName, hotel] of hotelGroups) {
    await createHotelActivity(Activity, stage, hotelName, hotel)
  }

  for (const { activityData } of otherActivities) {
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

module.exports = {
  parseICS,
  extractTripInfo,
  groupEventsByStage,
  convertToActivity,
  resolveStageName,
  groupActivitiesIntoStages,
  collectActivitiesFromStages,
  processStageActivities
}
