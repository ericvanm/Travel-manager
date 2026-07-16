const { suggestBookingUrl } = require('./booking-urls')
const { resolveTransportActivityType, isPersonalCarTransport } = require('./activity-field-cleanup')

const TRANSPORT_DURATION_HOURS = {
  flight: 8,
  train: 4,
  car: 5,
  private_car: 5,
  bus: 6,
  default: 4
}

const TRANSPORT_ACTIVITY_TYPES = new Set([
  'flight',
  'car_rental',
  'private_car',
  'train',
  'bus',
  'public_transport'
])

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
  if (isPersonalCarTransport(formData)) return 'car'
  const local = (formData.localTransport || '').toLowerCase()
  if (local.includes('voiture') || local.includes('car')) return 'car'
  if (local.includes('bus')) return 'bus'
  if (local.includes('train') || local.includes('metro')) return 'train'
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
  formData,
  startHour = 8
}) => {
  const duration = TRANSPORT_DURATION_HOURS[mode] || TRANSPORT_DURATION_HOURS.default
  const times = addHoursToIso(date, startHour, duration)
  const resolvedType = activityType || resolveTransportActivityType(mode, formData)
  const cost = resolvedType === 'private_car' ? 0 : estimatedCost

  return {
    mode,
    label,
    description,
    estimatedCost: cost,
    departureLocation,
    arrivalLocation,
    activityType: resolvedType,
    startDateTime: times.startDateTime,
    endDateTime: times.endDateTime,
    reservationStatus: 'to_reserve',
    bookingUrl: null
  }
}

const ensureActivityAfterArrival = (activity, arrivalEndIso) => {
  if (!arrivalEndIso || !activity?.startDateTime) return
  const arrivalEnd = new Date(arrivalEndIso)
  const actStart = new Date(activity.startDateTime)
  if (actStart >= arrivalEnd) return

  const actEnd = activity.endDateTime ? new Date(activity.endDateTime) : null
  const durationMs = actEnd && actEnd > actStart ? actEnd.getTime() - actStart.getTime() : 2 * 60 * 60 * 1000
  const newStart = new Date(arrivalEnd.getTime() + 60 * 60 * 1000)
  activity.startDateTime = newStart.toISOString()
  activity.endDateTime = new Date(newStart.getTime() + durationMs).toISOString()
}

const getStageArrivalEnd = (stage, stageIndex, itinerary) => {
  if (stage?.arrivalTransport?.endDateTime) return stage.arrivalTransport.endDateTime
  if (stageIndex === 0 && itinerary?.outboundTransport?.endDateTime) {
    return itinerary.outboundTransport.endDateTime
  }
  return `${parseDateOnly(stage?.startDate)}T14:00:00Z`
}

const enforceActivitiesAfterTransport = (itinerary) => {
  const scheduled = {
    ...itinerary,
    stages: (itinerary.stages || []).map((stage) => ({
      ...stage,
      activities: [...(stage.activities || [])]
    }))
  }

  scheduled.stages.forEach((stage, index) => {
    const arrivalEnd = getStageArrivalEnd(stage, index, scheduled)
    for (const activity of stage.activities || []) {
      const type = String(activity.activityType || '').toLowerCase()
      if (TRANSPORT_ACTIVITY_TYPES.has(type)) continue
      ensureActivityAfterArrival(activity, arrivalEnd)
    }
  })

  return scheduled
}

const stripTransportActivities = (activities = []) =>
  activities.filter((a) => !TRANSPORT_ACTIVITY_TYPES.has(String(a.activityType || '').toLowerCase()))

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
      scheduled.outboundTransport.activityType = resolveTransportActivityType(
        scheduled.outboundTransport.mode || scheduled.outboundTransport.activityType,
        formData
      )
      if (scheduled.outboundTransport.activityType === 'private_car') {
        scheduled.outboundTransport.estimatedCost = 0
      }
    }

    if (scheduled.returnTransport) {
      scheduled.returnTransport.departureLocation =
        scheduled.returnTransport.departureLocation || lastLoc
      scheduled.returnTransport.arrivalLocation =
        scheduled.returnTransport.arrivalLocation || formData.departureLocation
      scheduled.returnTransport.activityType = resolveTransportActivityType(
        scheduled.returnTransport.mode || scheduled.returnTransport.activityType,
        formData
      )
      if (scheduled.returnTransport.activityType === 'private_car') {
        scheduled.returnTransport.estimatedCost = 0
      }
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
        formData,
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

  return enforceActivitiesAfterTransport(scheduled)
}

module.exports = {
  scheduleItinerary,
  ensureActivityAfterArrival,
  enforceActivitiesAfterTransport,
  getStageArrivalEnd,
  buildTransportLeg,
  TRANSPORT_ACTIVITY_TYPES
}
