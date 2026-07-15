const { geocodePlaces } = require('./geocoding')

const TRANSPORT_TYPE_IDS = new Set([3, 6, 8])

const isTransportActivity = (activity) =>
  TRANSPORT_TYPE_IDS.has(activity.activityTypeId) ||
  activity.departureLocation ||
  activity.departureAirport

const buildPoint = (label, type, coords, extra = {}) => {
  if (!coords?.lat || !coords?.lng) return null
  return { lat: Number(coords.lat), lng: Number(coords.lng), label, type, ...extra }
}

const buildTripMapData = async (trip, stages, activities) => {
  const places = []
  if (trip.departureLocation) places.push(trip.departureLocation)

  for (const stage of stages) {
    places.push(stage.name)
    if (stage.Country?.name) places.push(stage.Country.name)
  }

  for (const activity of activities) {
    if (activity.city) places.push(activity.city)
    if (activity.departureLocation) places.push(activity.departureLocation)
    if (activity.arrivalLocation) places.push(activity.arrivalLocation)
    if (activity.departureAirport) places.push(activity.departureAirport)
    if (activity.arrivalAirport) places.push(activity.arrivalAirport)
    if (activity.name && activity.activityTypeId === 7) places.push(activity.name)
  }

  const geoMap = await geocodePlaces(places)

  const resolveCoords = (activity, stage) => {
    if (activity.latitude && activity.longitude) {
      return { lat: Number(activity.latitude), lng: Number(activity.longitude) }
    }
    const keys = [
      activity.city,
      activity.arrivalLocation,
      activity.departureLocation,
      activity.name,
      stage?.name
    ].filter(Boolean)
    for (const key of keys) {
      if (geoMap[key]) return geoMap[key]
    }
    return null
  }

  const mapPoints = []
  const routeSegments = []

  const departureCoords = trip.departureLocation ? geoMap[trip.departureLocation] : null
  if (departureCoords) {
    mapPoints.push(buildPoint(trip.departureLocation, 'departure', departureCoords))
  }

  const stagePoints = []
  for (const stage of stages) {
    let coords = null
    if (stage.latitude && stage.longitude) {
      coords = { lat: Number(stage.latitude), lng: Number(stage.longitude) }
    } else {
      coords = geoMap[stage.name] || null
    }
    const stagePoint = buildPoint(stage.name, 'stage', coords)
    if (stagePoint) {
      stagePoints.push(stagePoint)
      mapPoints.push(stagePoint)
    }
  }

  const sortedActivities = [...activities].sort((a, b) => {
    const da = a.startDateTime ? new Date(a.startDateTime).getTime() : 0
    const db = b.startDateTime ? new Date(b.startDateTime).getTime() : 0
    return da - db
  })

  for (const activity of sortedActivities) {
    const stage = stages.find((s) => s.id === activity.stageId)
    const coords = resolveCoords(activity, stage)
    const type = activity.activityTypeId === 7
      ? 'accommodation'
      : isTransportActivity(activity)
        ? 'transport'
        : 'activity'

    const point = buildPoint(activity.name || stage?.name || 'Point', type, coords, {
      estimatedCost: activity.cost ? Number(activity.cost) : null,
      transportMode: activity.activityTypeId === 6 ? 'flight' : activity.activityTypeId === 8 ? 'car' : 'default',
      reservationStatus: activity.reservationStatus
    })
    if (point) mapPoints.push(point)
  }

  if (departureCoords && stagePoints[0]) {
    const firstTransport = sortedActivities.find((a) => isTransportActivity(a))
    routeSegments.push({
      from: buildPoint(trip.departureLocation, 'departure', departureCoords),
      to: stagePoints[0],
      transportMode: firstTransport?.activityTypeId === 6 ? 'flight' : 'default',
      estimatedCost: firstTransport?.cost ? Number(firstTransport.cost) : null,
      label: firstTransport?.name || `${trip.departureLocation} → ${stagePoints[0].label}`
    })
  }

  for (let i = 0; i < stagePoints.length - 1; i += 1) {
    routeSegments.push({
      from: stagePoints[i],
      to: stagePoints[i + 1],
      transportMode: 'train',
      label: `${stagePoints[i].label} → ${stagePoints[i + 1].label}`
    })
  }

  if (stagePoints.length > 0 && departureCoords) {
    const returnTransport = [...sortedActivities].reverse().find((a) => isTransportActivity(a))
    routeSegments.push({
      from: stagePoints[stagePoints.length - 1],
      to: buildPoint(trip.departureLocation, 'departure', departureCoords),
      transportMode: returnTransport?.activityTypeId === 6 ? 'flight' : 'default',
      estimatedCost: returnTransport?.cost ? Number(returnTransport.cost) : null,
      label: returnTransport?.name || `Retour vers ${trip.departureLocation}`
    })
  }

  return {
    departureLocation: trip.departureLocation || null,
    currency: trip.currency || 'EUR',
    mapPoints: mapPoints.filter(Boolean),
    routeSegments: routeSegments.filter((s) => s.from && s.to)
  }
}

module.exports = { buildTripMapData }
