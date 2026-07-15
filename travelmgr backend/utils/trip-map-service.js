const { geocodePlaces } = require('./geocoding')
const { buildGeoQuery, extractStageCity } = require('./itinerary-location-validator')

const TRANSPORT_TYPE_IDS = new Set([3, 6, 8])

const hasCoords = (coords) =>
  coords != null && coords.lat != null && coords.lng != null && !Number.isNaN(coords.lat) && !Number.isNaN(coords.lng)

const isTransportActivity = (activity) =>
  TRANSPORT_TYPE_IDS.has(activity.activityTypeId)
  || activity.departureLocation
  || activity.departureAirport

const toPlain = (model) => (model?.toJSON ? model.toJSON() : model)

const buildPoint = (label, type, coords, extra = {}) => {
  if (!hasCoords(coords)) return null
  return {
    lat: Number(coords.lat),
    lng: Number(coords.lng),
    label: label || 'Point',
    type,
    ...extra
  }
}

const inferTransportMode = (activity) => {
  if (activity.activityTypeId === 6) return 'flight'
  if (activity.activityTypeId === 8) return 'car'
  return 'default'
}

const resolveCoords = (activity, stage, geoMap) => {
  const act = toPlain(activity)
  if (act.latitude != null && act.longitude != null) {
    return { lat: Number(act.latitude), lng: Number(act.longitude) }
  }
  const actKey = act.activityTypeId === 7 ? `acc-${act.id}` : `act-${act.id}`
  if (geoMap[actKey]) return geoMap[actKey]
  if (stage?.name && geoMap[stage.name]) return geoMap[stage.name]
  if (act.city && geoMap[act.city]) return geoMap[act.city]
  return null
}

const buildTripMapData = async (trip, stages, activities, language = 'en') => {
  const tripData = toPlain(trip)
  const stageList = stages.map(toPlain)
  const activityList = activities.map(toPlain)

  let departureLabel = tripData.departureLocation

  const transportActivities = activityList.filter(isTransportActivity)
  if (!departureLabel && transportActivities.length > 0) {
    const first = transportActivities[0]
    departureLabel = first.departureLocation || first.departureAirport || null
  }

  const geoQueries = []
  const geoKeys = []

  if (departureLabel) {
    geoQueries.push(departureLabel)
    geoKeys.push(departureLabel)
  }

  for (const stage of stageList) {
    const stageCity = extractStageCity(stage, { geographicZone: stage.Country?.name || stage.name })
    const q = buildGeoQuery({ city: stageCity, stageName: stage.name, geographicZone: stage.Country?.name || '' })
    geoQueries.push(q)
    geoKeys.push(stage.name)
  }

  for (const activity of activityList) {
    const stage = stageList.find((s) => s.id === activity.stageId)
    const stageCity = stage ? extractStageCity(stage, {}) : activity.city
    if (activity.activityTypeId === 7) {
      const q = buildGeoQuery({ name: activity.name, city: activity.city || stageCity, stageName: stage?.name })
      geoQueries.push(q)
      geoKeys.push(`acc-${activity.id}`)
    } else if (activity.city || stageCity) {
      const q = buildGeoQuery({ name: activity.name, city: activity.city || stageCity, stageName: stage?.name })
      geoQueries.push(q)
      geoKeys.push(`act-${activity.id}`)
    }
  }

  const geoResults = await geocodePlaces(geoQueries, language)
  const geoMap = {}
  geoKeys.forEach((key, idx) => {
    geoMap[key] = geoResults[geoQueries[idx]]
  })

  const mapPoints = []
  const routeSegments = []

  const departureCoords = departureLabel ? geoMap[departureLabel] : null
  if (departureCoords) {
    mapPoints.push(buildPoint(departureLabel, 'departure', departureCoords))
  }

  const stagePoints = []
  const stageHubById = new Map()

  for (const stage of stageList) {
    let coords = null
    if (stage.latitude != null && stage.longitude != null) {
      coords = { lat: Number(stage.latitude), lng: Number(stage.longitude) }
    } else if (stage.name && geoMap[stage.name]) {
      coords = geoMap[stage.name]
    }
    const stagePoint = buildPoint(stage.name, 'stage', coords)
    if (stagePoint) {
      stagePoints.push(stagePoint)
      stageHubById.set(stage.id, stagePoint)
      mapPoints.push(stagePoint)
    }
  }

  const sortedActivities = [...activityList].sort((a, b) => {
    const da = a.startDateTime ? new Date(a.startDateTime).getTime() : 0
    const db = b.startDateTime ? new Date(b.startDateTime).getTime() : 0
    return da - db
  })

  const activityPoints = []

  for (const activity of sortedActivities) {
    const stage = stageList.find((s) => s.id === activity.stageId)
    const coords = resolveCoords(activity, stage, geoMap)
    const type = activity.activityTypeId === 7
      ? 'accommodation'
      : isTransportActivity(activity)
        ? 'transport'
        : 'activity'

    const point = buildPoint(activity.name || stage?.name || 'Point', type, coords, {
      estimatedCost: activity.cost != null ? Number(activity.cost) : null,
      transportMode: inferTransportMode(activity),
      reservationStatus: activity.reservationStatus
    })
    if (point) {
      mapPoints.push(point)
      if (type === 'activity' || type === 'accommodation') {
        activityPoints.push({ activity, stage, point })
      }
    }
  }

  // Outbound: departure → first stage (or first transport arrival)
  if (departureCoords && stagePoints[0]) {
    const firstTransport = sortedActivities.find(isTransportActivity)
    routeSegments.push({
      from: buildPoint(departureLabel, 'departure', departureCoords),
      to: stagePoints[0],
      transportMode: firstTransport ? inferTransportMode(firstTransport) : 'default',
      estimatedCost: firstTransport?.cost != null ? Number(firstTransport.cost) : null,
      label: firstTransport?.name || `${departureLabel} → ${stagePoints[0].label}`,
      isLocal: false
    })
  }

  // Inter-stage: use explicit transport activities when they connect stages
  for (let i = 0; i < stageList.length - 1; i += 1) {
    const fromStage = stageList[i]
    const toStage = stageList[i + 1]
    const fromHub = stageHubById.get(fromStage.id)
    const toHub = stageHubById.get(toStage.id)
    if (!fromHub || !toHub) continue

    const interTransport = sortedActivities.find((act) => {
      if (!isTransportActivity(act)) return false
      const actStage = stageList.find((s) => s.id === act.stageId)
      return actStage?.id === toStage.id
        && (act.departureLocation || act.departureAirport || act.name || '').toLowerCase()
          .includes((fromStage.name || '').split(',')[0].trim().toLowerCase().slice(0, 8))
    }) || sortedActivities.find((act) =>
      isTransportActivity(act) && act.stageId === toStage.id
    )

    routeSegments.push({
      from: fromHub,
      to: toHub,
      transportMode: interTransport ? inferTransportMode(interTransport) : 'train',
      estimatedCost: interTransport?.cost != null ? Number(interTransport.cost) : null,
      label: interTransport?.name || `${fromHub.label} → ${toHub.label}`,
      isLocal: false
    })
  }

  // Local displacement: stage/accommodation hub → each activity on site
  for (const { activity, stage, point } of activityPoints) {
    const hub = stageHubById.get(stage?.id)
      || activityPoints.find((ap) =>
        ap.stage?.id === stage?.id && ap.activity.activityTypeId === 7
      )?.point

    if (!hub || !point) continue
    if (hub.lat === point.lat && hub.lng === point.lng) continue

    routeSegments.push({
      from: hub,
      to: point,
      transportMode: 'local',
      label: `${hub.label} → ${point.label}`,
      isLocal: true
    })
  }

  // Return leg
  if (stagePoints.length > 0 && departureCoords) {
    const returnTransport = [...sortedActivities].reverse().find(isTransportActivity)
    routeSegments.push({
      from: stagePoints[stagePoints.length - 1],
      to: buildPoint(departureLabel, 'departure', departureCoords),
      transportMode: returnTransport ? inferTransportMode(returnTransport) : 'default',
      estimatedCost: returnTransport?.cost != null ? Number(returnTransport.cost) : null,
      label: returnTransport?.name || `Retour vers ${departureLabel}`,
      isLocal: false
    })
  }

  return {
    departureLocation: departureLabel || null,
    currency: tripData.currency || 'EUR',
    mapPoints: mapPoints.filter(Boolean),
    routeSegments: routeSegments.filter((s) => s.from && s.to)
  }
}

module.exports = { buildTripMapData }
