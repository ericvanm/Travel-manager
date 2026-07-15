const geocodeCache = new Map()

const geocodePlace = async (placeName) => {
  const query = String(placeName || '').trim()
  if (!query) return null

  if (geocodeCache.has(query)) {
    return geocodeCache.get(query)
  }

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('q', query)
    url.searchParams.set('format', 'json')
    url.searchParams.set('limit', '1')

    const response = await fetch(url, {
      headers: { 'User-Agent': 'TravelManager/1.0 (trip-planning)' }
    })

    if (!response.ok) return null

    const results = await response.json()
    if (!results?.[0]) return null

    const point = {
      lat: Number.parseFloat(results[0].lat),
      lng: Number.parseFloat(results[0].lon),
      label: query
    }
    geocodeCache.set(query, point)
    return point
  } catch {
    return null
  }
}

const geocodePlaces = async (places) => {
  const unique = [...new Set(places.filter(Boolean))]
  const entries = await Promise.all(unique.map(async (place) => [place, await geocodePlace(place)]))
  return Object.fromEntries(entries)
}

module.exports = {
  geocodePlace,
  geocodePlaces
}
