const geocodeCache = new Map()

const geocodePlace = async (placeName, language = 'en') => {
  const query = String(placeName || '').trim()
  if (!query) return null

  const cacheKey = `${language}:${query}`
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)
  }

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('q', query)
    url.searchParams.set('format', 'json')
    url.searchParams.set('limit', '1')

    const acceptLanguage = language === 'fr' ? 'fr' : language === 'es' ? 'es' : language === 'nl' ? 'nl' : 'en'

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TravelManager/1.0 (trip-planning)',
        'Accept-Language': `${acceptLanguage},en;q=0.9`
      }
    })

    if (!response.ok) return null

    const results = await response.json()
    if (!results?.[0]) return null

    const point = {
      lat: Number.parseFloat(results[0].lat),
      lng: Number.parseFloat(results[0].lon),
      label: results[0].display_name || query
    }
    geocodeCache.set(cacheKey, point)
    return point
  } catch {
    return null
  }
}

const geocodePlaces = async (places, language = 'en') => {
  const unique = [...new Set(places.filter(Boolean))]
  const entries = await Promise.all(unique.map(async (place) => [place, await geocodePlace(place, language)]))
  return Object.fromEntries(entries)
}

module.exports = {
  geocodePlace,
  geocodePlaces
}
