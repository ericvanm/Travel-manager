const parseCSVLine = (line) => {
  const result = []
  let current = ''
  let inQuotes = false

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
      continue
    }
    current += char
  }

  result.push(current.trim())
  return result
}

const parseCSVDate = (dateStr, timezone = 'UTC') => {
  if (!dateStr || dateStr.trim() === '') return null

  try {
    if (dateStr.includes('T') && (dateStr.endsWith('Z') || dateStr.includes('+') || dateStr.includes('-'))) {
      return new Date(dateStr)
    }

    if (dateStr.includes(' ') && dateStr.includes('/')) {
      const [datePart, timePart] = dateStr.split(' ')
      const [day, month, year] = datePart.split('/')
      const isoString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timePart}`
      if (timezone === 'Africa/Johannesburg') {
        return new Date(new Date(isoString).getTime() - (2 * 60 * 60 * 1000))
      }
      return new Date(`${isoString}Z`)
    }

    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/')
      return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      if (timezone === 'Africa/Johannesburg') {
        return new Date(new Date(`${dateStr}T00:00:00`).getTime() - (2 * 60 * 60 * 1000))
      }
      return new Date(`${dateStr}T00:00:00Z`)
    }

    return new Date(dateStr)
  } catch (error) {
    console.error('Date parsing error:', error, dateStr)
    return null
  }
}

const rowToObject = (headers, values) => {
  const data = {}
  headers.forEach((header, index) => {
    data[header] = values[index] || ''
  })
  return data
}

const buildNonHotelActivity = (data, activityType, timezone) => ({
  name: data['Activity Name'],
  activityTypeId: activityType.id,
  startDateTime: parseCSVDate(data['Activity Start DateTime'], timezone),
  endDateTime: parseCSVDate(data['Activity End DateTime'], timezone),
  stageName: data['Stage Name'],
  city: data['Activity City'],
  cost: data['Activity Cost'] ? parseFloat(data['Activity Cost']) : null,
  airline: data.Airline,
  flightNumber: data['Flight Number'],
  departureAirport: data['Departure Airport'],
  arrivalAirport: data['Arrival Airport'],
  seat: data.Seat,
  gate: data.Gate,
  terminal: data.Terminal,
  company: data['Car Company'],
  pickupLocation: data['Pickup Location'],
  dropoffLocation: data['Dropoff Location'],
  pickupDate: parseCSVDate(data['Pickup Date'], timezone),
  dropoffDate: parseCSVDate(data['Dropoff Date'], timezone),
  carType: data['Car Type'],
  confirmationNumber: data['Confirmation Number']
})

const updateHotelGroup = (hotelGroups, data, timezone) => {
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
  const checkInDate = parseCSVDate(data['Check-in Date'], timezone)
  const checkOutDate = parseCSVDate(data['Check-out Date'], timezone)
  const startDateTime = parseCSVDate(data['Activity Start DateTime'], timezone)
  const endDateTime = parseCSVDate(data['Activity End DateTime'], timezone)

  if (checkInDate || startDateTime) {
    hotel.checkIn = checkInDate || startDateTime
  }
  if (checkOutDate || endDateTime) {
    hotel.checkOut = checkOutDate || endDateTime
  }
}

const hotelGroupsToActivities = (hotelGroups) => {
  const activities = []
  for (const [hotelName, hotel] of hotelGroups) {
    if (!hotel.checkIn) continue
    activities.push({
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
  return activities
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
        activities: [activity],
        startDate: activity.startDateTime,
        endDate: activity.endDateTime || activity.startDateTime
      }
      continue
    }

    currentStage.activities.push(activity)
    if (activity.endDateTime && activity.endDateTime > currentStage.endDate) {
      currentStage.endDate = activity.endDateTime
    }
  }

  if (currentStage) {
    finalStages.push(currentStage)
  }

  return finalStages
}

const activityToRecord = (activityData, stageId) => ({
  name: activityData.name,
  stageId,
  activityTypeId: activityData.activityTypeId,
  startDateTime: activityData.startDateTime,
  endDateTime: activityData.endDateTime,
  city: activityData.city,
  cost: activityData.cost,
  airline: activityData.airline,
  flightNumber: activityData.flightNumber,
  departureAirport: activityData.departureAirport,
  arrivalAirport: activityData.arrivalAirport,
  seat: activityData.seat,
  gate: activityData.gate,
  terminal: activityData.terminal,
  address: activityData.address,
  phone: activityData.phone,
  checkInDate: activityData.checkInDate,
  checkOutDate: activityData.checkOutDate,
  roomType: activityData.roomType,
  confirmationNumber: activityData.confirmationNumber,
  company: activityData.company,
  pickupLocation: activityData.pickupLocation,
  dropoffLocation: activityData.dropoffLocation,
  pickupDate: activityData.pickupDate,
  dropoffDate: activityData.dropoffDate,
  carType: activityData.carType
})

module.exports = {
  parseCSVLine,
  parseCSVDate,
  rowToObject,
  buildNonHotelActivity,
  updateHotelGroup,
  hotelGroupsToActivities,
  groupActivitiesIntoStages,
  activityToRecord
}
