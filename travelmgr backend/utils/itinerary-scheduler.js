const { suggestBookingUrl } = require('./booking-urls')

const TRANSPORT_DURATION_HOURS = {
  flight: 8,
  train: 4,
  car: 5,
  bus: 6,
  default: 4
}

const parseDateOnly = (value) => {
  if (!value) return null
  return String(value).slice(0, 10)
}

const addHoursToIso = (dateStr, hour, durationHours) => {
  const base = new Date(`${parseDateOnly(dateStr)}T${String(hour).padStart(2, '0')}:00:00Z`)
  const end = new Date(base.getTime() + durationHours * 60 * 60 * 1000)
  return {
    startDateTime: base.toISOString(),
    endDateTime: end.toISOString()
  }
}

const inferInterStageMode = (formData, fromLoc, toLoc) => {
  const local = (formData.localTransport || '').toLowerCase()
  if (local.includes('voiture') || local.includes('car')) return 'car'
  if (local.includes('bus')) return 'bus'
  if (local.includes('train')) return 'train'
  const from = fromLoc.toLowerCase()
  const to = toLoc.toLowerCase()
  if (from.includes('aéroport') || to.includes('aéroport') || from.includes('airport') || to.includes('airport')) {
    return 'flight'
  }
  return 'train'
}

const buildTransportLeg = ({
  mode,
  label,
  description,
  estimatedCost,
  departureLocation,
  arrivalLocation,
  date,
  activityType,
  startHour = 8
}) => {
  const duration = TRANSPORT_DURATION_HOURS[mode] || TRANSPORT_DURATION_HOURS.default
  const times = addHoursToIso(date, startHour, duration)
  return {
    mode,
    label,
    description,
    estimatedCost,
    departureLocation,
    arrivalLocation,
    activityType: activityType || (mode === 'flight' ? 'flight' : mode === 'car' ? 'car_rental' : 'tour'),
    startDateTime: times.startDateTime,
    endDateTime: times.endDateTime,
    reservationStatus: 'to_reserve',
    bookingUrl: null
  }
}

const ensureActivityAfterArrival = (activity, arrivalEndIso) => {
  if (!arrivalEndIso || !activity.startDateTime) return
  const arrivalEnd = new Date(arrivalEndIso)
  const actStart = new Date(activity.startDateTime)
  if (actStart >= arrivalEnd) return

  const actEnd = activity.endDateTime ? new Date(activity.endDateTime) : null
  const durationMs = actEnd && actEnd > actStart ? actEnd.getTime() - actStart.getTime() : 8 * 60 * 60 * 1000
  const newStart = new Date(arrivalEnd.getTime() + 60 * 60 * 1000)
  activity.startDateTime = newStart.toISOString()
  activity.endDateTime = new Date(newStart.getTime() + durationMs).toISOString()
}

const stripTransportActivities = (activities = []) =>
  activities.filter((a) => !['flight', 'car_rental'].includes(a.activityType))

const scheduleItinerary = (itinerary, formData) => {
  const scheduled = { ...itinerary, stages: (itinerary.stages || []).map((s) => ({ ...s })) }
  const stages = scheduled.stages

  if (stages.length > 0) {
    const firstLoc = stages[0].name.split(',')[0].trim()
    const lastLoc = stages[stages.length - 1].name.split(',')[0].trim()

    if (scheduled.outboundTransport) {
      scheduled.outboundTransport.departureLocation =
        scheduled.outboundTransport.departureLocation || formData.departureLocation
      scheduled.outboundTransport.arrivalLocation =
        scheduled.outboundTransport.arrivalLocation || firstLoc
    }

    if (scheduled.returnTransport) {
      scheduled.returnTransport.departureLocation =
        scheduled.returnTransport.departureLocation || lastLoc
      scheduled.returnTransport.arrivalLocation =
        scheduled.returnTransport.arrivalLocation || formData.departureLocation
    }
  }

  const interStageBudget = Math.round((formData.budget || 0) * 0.03)

  for (let i = 0; i < stages.length; i += 1) {
    const stage = stages[i]
    const prevStage = i > 0 ? stages[i - 1] : null
    let arrivalEnd = `${parseDateOnly(stage.startDate)}T14:00:00Z`

    stage.activities = stripTransportActivities(stage.activities)

    if (i === 0 && scheduled.outboundTransport) {
      const transport = scheduled.outboundTransport
      const times = addHoursToIso(
        scheduled.trip?.startDate || stage.startDate,
        6,
        TRANSPORT_DURATION_HOURS[transport.mode] || TRANSPORT_DURATION_HOURS.default
      )
      stage.arrivalTransport = {
        ...transport,
        label: transport.label || `Aller : ${transport.departureLocation} → ${transport.arrivalLocation}`,
        ...times,
        reservationStatus: 'to_reserve',
        bookingUrl: suggestBookingUrl('transport', transport, formData)
      }
      arrivalEnd = stage.arrivalTransport.endDateTime
    } else if (i > 0 && prevStage) {
      const fromLoc = prevStage.name.split(',')[0].trim()
      const toLoc = stage.name.split(',')[0].trim()
      const mode = inferInterStageMode(formData, fromLoc, toLoc)
      stage.arrivalTransport = buildTransportLeg({
        mode,
        label: `${fromLoc} → ${toLoc}`,
        description: `Transport entre ${fromLoc} et ${toLoc} (obligatoire avant les activités sur place).`,
        estimatedCost: interStageBudget,
        departureLocation: fromLoc,
        arrivalLocation: toLoc,
        date: stage.startDate,
        startHour: 7
      })
      stage.arrivalTransport.bookingUrl = suggestBookingUrl('transport', stage.arrivalTransport, formData)
      arrivalEnd = stage.arrivalTransport.endDateTime
    }

    for (const activity of stage.activities || []) {
      ensureActivityAfterArrival(activity, arrivalEnd)
      activity.reservationStatus = activity.reservationStatus || 'to_reserve'
      activity.bookingUrl = suggestBookingUrl('activity', activity, formData)
    }

    for (const accommodation of stage.accommodations || []) {
      accommodation.reservationStatus = accommodation.reservationStatus || 'to_reserve'
      accommodation.bookingUrl = suggestBookingUrl('accommodation', accommodation, formData)
    }
  }

  if (scheduled.outboundTransport) {
    scheduled.outboundTransport.reservationStatus = scheduled.outboundTransport.reservationStatus || 'to_reserve'
    scheduled.outboundTransport.bookingUrl =
      scheduled.outboundTransport.bookingUrl || suggestBookingUrl('transport', scheduled.outboundTransport, formData)
  }

  if (scheduled.returnTransport && stages.length > 0) {
    const lastStage = stages[stages.length - 1]
    const times = addHoursToIso(
      scheduled.trip?.endDate || lastStage.endDate,
      10,
      TRANSPORT_DURATION_HOURS[scheduled.returnTransport.mode] || TRANSPORT_DURATION_HOURS.default
    )
    scheduled.returnTransport = {
      ...scheduled.returnTransport,
      ...times,
      reservationStatus: scheduled.returnTransport.reservationStatus || 'to_reserve',
      bookingUrl:
        scheduled.returnTransport.bookingUrl ||
        suggestBookingUrl('transport', scheduled.returnTransport, formData)
    }
  }

  scheduled.interStageTransports = stages
    .map((s) => s.arrivalTransport)
    .filter((t, idx) => t && idx > 0)

  return scheduled
}

module.exports = {
  scheduleItinerary,
  ensureActivityAfterArrival,
  buildTransportLeg
}
