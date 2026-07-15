/**
 * Location matching helpers for trip consistency checks.
 */

const { ACTIVITY_TYPE, isTransportTypeId } = require('./activity-types')

const normalizeLocationToken = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[,—\-–|/]/)[0]
    .trim()

const extractStageCity = (stage) => {
  const raw = (stage?.name || '').split('—')[0].split(',')[0].trim()
  if (raw) return raw
  return stage?.Country?.name || ''
}

const isReturnStage = (stage) =>
  /retour|return|renv|^back\b|domicile|home/i.test(stage?.name || '')

const locationsCompatible = (activityLocation, stageLocation) => {
  const a = normalizeLocationToken(activityLocation)
  const b = normalizeLocationToken(stageLocation)
  if (!a || !b) return false
  if (a === b) return true
  if (a.length >= 3 && b.length >= 3 && (a.includes(b) || b.includes(a))) return true
  return false
}

const getHotelLocation = (activity) =>
  activity?.city || activity?.address || null

const getActivityLocation = (activity) => {
  if (activity?.activityTypeId === ACTIVITY_TYPE.HOTEL) return getHotelLocation(activity)
  return activity?.city || null
}

const getTransportArrival = (activity) => {
  if (activity?.activityTypeId === ACTIVITY_TYPE.CAR_RENTAL) {
    return activity?.dropoffLocation || activity?.arrivalLocation || activity?.arrivalAirport || null
  }
  return activity?.arrivalLocation || activity?.arrivalAirport || null
}

const getTransportDeparture = (activity) => {
  if (activity?.activityTypeId === ACTIVITY_TYPE.CAR_RENTAL) {
    return activity?.pickupLocation || activity?.departureLocation || activity?.departureAirport || null
  }
  return activity?.departureLocation || activity?.departureAirport || null
}

const isTransportActivity = (activity) =>
  isTransportTypeId(activity?.activityTypeId)
  || Boolean(
    activity?.departureLocation
    || activity?.departureAirport
    || activity?.pickupLocation
  )

const matchesHomeLocation = (location, trip) => {
  if (!location || !trip?.departureLocation) return false
  return locationsCompatible(location, trip.departureLocation)
}

/** Return leg to home (e.g. Tokyo → Brussels on last stage). */
const isReturnHomeTransport = (activity, trip, stage, stages) => {
  const arrival = getTransportArrival(activity)
  if (!arrival || !trip?.departureLocation) return false
  if (!matchesHomeLocation(arrival, trip)) return false

  const stageIdx = stages.indexOf(stage)
  const isLastStage = stageIdx === stages.length - 1
  return isLastStage || isReturnStage(stage)
}

/**
 * A transport is coherent if departure OR arrival matches the stage,
 * an adjacent stage, or home (return). Transports naturally span two locations.
 */
const isTransportStageCoherent = (activity, stage, stages, trip) => {
  if (isReturnHomeTransport(activity, trip, stage, stages)) return true

  const stageCity = extractStageCity(stage)
  const stageIdx = stages.indexOf(stage)
  const prevStage = stageIdx > 0 ? stages[stageIdx - 1] : null
  const nextStage = stageIdx < stages.length - 1 ? stages[stageIdx + 1] : null

  const contextCities = [
    stageCity,
    prevStage ? extractStageCity(prevStage) : null,
    nextStage ? extractStageCity(nextStage) : null,
    trip?.departureLocation
  ].filter(Boolean)

  const departure = getTransportDeparture(activity)
  const arrival = getTransportArrival(activity)
  const endpoints = [departure, arrival].filter(Boolean)

  if (endpoints.length === 0) return false

  return endpoints.some((endpoint) =>
    contextCities.some((city) => locationsCompatible(endpoint, city))
  )
}

module.exports = {
  normalizeLocationToken,
  extractStageCity,
  isReturnStage,
  locationsCompatible,
  getHotelLocation,
  getActivityLocation,
  getTransportArrival,
  getTransportDeparture,
  isTransportActivity,
  matchesHomeLocation,
  isReturnHomeTransport,
  isTransportStageCoherent
}
