const { geocodePlaces } = require('./geocoding')
const { parseDateOnly, addDays } = require('./date-only')
const { listNightsToCover } = require('./trip-accommodation-validation')
const { accommodationCoversNight } = require('./accommodation-planning')

const extractStageCity = (stage, formData) => {
  const raw = (stage?.name || '').split('—')[0].split(',')[0].trim()
  if (raw) return raw
  return (formData?.geographicZone || '').split(',')[0].trim()
}

const buildGeoQuery = ({ name, city, stageName, geographicZone }) => {
  const stageCity = city || extractStageCity({ name: stageName }, { geographicZone })
  const zone = (geographicZone || '').split(',')[0].trim()
  if (name && stageCity && zone && !name.toLowerCase().includes(stageCity.toLowerCase())) {
    return `${name}, ${stageCity}, ${zone}`
  }
  if (name && stageCity) return `${name}, ${stageCity}`
  if (stageCity && zone) return `${stageCity}, ${zone}`
  return stageCity || name || zone
}

const haversineKm = (a, b) => {
  if (!a?.lat || !b?.lat) return 0
  const toRad = (d) => (d * Math.PI) / 180
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

const normalizeStageLocations = (itinerary, formData) => {
  const zone = formData?.geographicZone || ''
  for (const stage of itinerary.stages || []) {
    const stageCity = extractStageCity(stage, formData)
    stage.locationCity = stageCity

    for (const activity of stage.activities || []) {
      activity.city = stageCity
      if (!activity.comments?.includes(stageCity)) {
        activity.comments = [activity.comments, `Lieu : ${stageCity}`].filter(Boolean).join(' — ')
      }
    }

    for (const accommodation of stage.accommodations || []) {
      accommodation.city = stageCity
      const name = accommodation.name || ''
      if (stageCity && !name.toLowerCase().includes(stageCity.toLowerCase())) {
        accommodation.name = `${name.replace(/\s*—.*$/, '').trim()} — ${stageCity}`
      }
      accommodation.addressHint = buildGeoQuery({
        name: accommodation.name,
        city: stageCity,
        geographicZone: zone
      })
    }
  }
  return itinerary
}

const findStageForDay = (stages, day) => {
  for (const stage of stages) {
    const start = parseDateOnly(stage.startDate)
    const end = parseDateOnly(stage.endDate)
    if (start && end && start <= day && day <= end) return stage
  }
  return stages[0] || null
}

const ensureDailyAccommodation = (itinerary, formData) => {
  const trip = itinerary.trip || {}
  const stages = itinerary.stages || []
  const days = listNightsToCover(trip, stages)
  if (days.length === 0) return itinerary

  const allAccommodations = stages.flatMap((s) => s.accommodations || [])
  const lodgingBudget = Math.round((formData?.budget || 0) * 0.35 / Math.max(days.length, 1))

  for (const day of days) {
    const covered = allAccommodations.some((acc) => accommodationCoversNight(day, acc))
    if (covered) continue

    const stage = findStageForDay(stages, day)
    if (!stage) continue

    const stageCity = extractStageCity(stage, formData)
    const nextDay = addDays(day, 1)
    const placeholder = {
      name: `Hébergement ${formData?.accommodationType || 'hôtel'} — ${stageCity}`,
      type: formData?.accommodationType || 'hôtel',
      city: stageCity,
      checkInDate: day,
      checkOutDate: nextDay,
      estimatedCost: lodgingBudget || Math.round((formData?.budget || 0) / days.length / 3),
      reservationStatus: 'to_reserve',
      comments: `Nuit du ${day} — hébergement ajouté automatiquement pour couvrir chaque jour du voyage.`
    }
    stage.accommodations = stage.accommodations || []
    stage.accommodations.push(placeholder)
    allAccommodations.push(placeholder)
  }

  return itinerary
}

const geocodeItineraryLocations = async (itinerary, formData) => {
  const zone = formData?.geographicZone || ''
  const queries = []
  const refs = []

  for (const stage of itinerary.stages || []) {
    const stageCity = extractStageCity(stage, formData)
    const stageQuery = buildGeoQuery({ city: stageCity, geographicZone: zone })
    queries.push(stageQuery)
    refs.push({ type: 'stage', stage, field: 'stage' })

    for (const act of stage.activities || []) {
      const q = buildGeoQuery({
        name: act.name,
        city: act.city || stageCity,
        stageName: stage.name,
        geographicZone: zone
      })
      queries.push(q)
      refs.push({ type: 'activity', stage, item: act, query: q })
    }

    for (const acc of stage.accommodations || []) {
      const q = acc.addressHint || buildGeoQuery({
        name: acc.name,
        city: acc.city || stageCity,
        stageName: stage.name,
        geographicZone: zone
      })
      queries.push(q)
      refs.push({ type: 'accommodation', stage, item: acc, query: q })
    }
  }

  const geoMap = await geocodePlaces(queries)
  const stageAnchors = new Map()

  for (const ref of refs) {
    if (ref.type !== 'stage') continue
    const stageCity = extractStageCity(ref.stage, formData)
    const q = buildGeoQuery({ city: stageCity, geographicZone: zone })
    const coords = geoMap[q]
    if (coords) stageAnchors.set(ref.stage, coords)
  }

  for (const ref of refs) {
    if (ref.type === 'stage') {
      const stageCity = extractStageCity(ref.stage, formData)
      const q = buildGeoQuery({ city: stageCity, geographicZone: zone })
      const coords = geoMap[q]
      if (coords) {
        ref.stage.latitude = coords.lat
        ref.stage.longitude = coords.lng
      }
      continue
    }

    const anchor = stageAnchors.get(ref.stage)
    let coords = geoMap[ref.query]
    if (coords && anchor && haversineKm(anchor, coords) > 150) {
      coords = anchor
    }
    if (!coords && anchor) coords = anchor

    if (coords && ref.item) {
      ref.item.latitude = coords.lat
      ref.item.longitude = coords.lng
      if (!ref.item.city) {
        ref.item.city = extractStageCity(ref.stage, formData)
      }
    }
  }

  return itinerary
}

module.exports = {
  extractStageCity,
  buildGeoQuery,
  normalizeStageLocations,
  ensureDailyAccommodation,
  geocodeItineraryLocations,
  haversineKm
}
