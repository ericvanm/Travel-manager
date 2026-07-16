const { renderSiteUrl, resolveInspirationSites } = require('./activity-inspiration-sites')

const encodeQuery = (query) => encodeURIComponent(String(query || '').trim())

const ALLOWED_BOOKING_HOSTS = [
  'getyourguide.com',
  'www.getyourguide.com',
  'viator.com',
  'www.viator.com',
  'tripadvisor.com',
  'www.tripadvisor.com',
  'klook.com',
  'www.klook.com',
  'booking.com',
  'www.booking.com',
  'google.com',
  'www.google.com',
  'thetrainline.com',
  'www.thetrainline.com',
  'flixbus.com',
  'www.flixbus.com',
  'rentalcars.com',
  'www.rentalcars.com'
]

const URL_VERIFY_TIMEOUT_MS = 4000

const parseHttpUrl = (value) => {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url
  } catch {
    return null
  }
}

const isAllowedBookingHost = (url) => {
  const hostname = url.hostname.toLowerCase()
  return ALLOWED_BOOKING_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host.replace(/^www\./, '')}`))
}

const isGetYourGuideSearchUrl = (url) => {
  const path = url.pathname.toLowerCase()
  return path === '/s' || path === '/s/' || path.startsWith('/s/')
}

const buildActivitySearchQuery = (activity, formData = null) => {
  const city = activity.city || activity.arrivalLocation || ''
  const name = activity.name || ''
  const zone = formData?.geographicZone || ''
  return [city, name, zone].filter(Boolean).join(' ').trim() || name || zone || 'activities'
}

const pickInspirationSiteTemplate = (formData = null) => {
  const sites = resolveInspirationSites(formData || {})
  const preferred = sites.find((s) => s.name.toLowerCase().includes('getyourguide')) || sites[0]
  return preferred?.urlTemplate || 'https://www.getyourguide.com/s?q={{query}}'
}

const suggestActivityBookingUrl = (activity, formData = null) => {
  const type = (activity.activityType || '').toLowerCase()
  const query = buildActivitySearchQuery(activity, formData)
  const template = pickInspirationSiteTemplate(formData)

  if (type === 'restaurant') {
    return `https://www.google.com/search?q=${encodeQuery(`${query} restaurant reservation`)}`
  }
  if (type === 'museum' || type === 'tour' || type === 'entertainment' || type === 'shopping') {
    return renderSiteUrl(template, query)
  }
  if (type === 'hotel') {
    return suggestAccommodationBookingUrl(activity, formData)
  }
  if (type === 'train') {
    return 'https://www.thetrainline.com'
  }
  if (type === 'bus') {
    return 'https://www.flixbus.com'
  }
  if (type === 'public_transport') {
    return `https://www.google.com/search?q=${encodeQuery(`${query} public transport tickets`)}`
  }
  return `https://www.google.com/search?q=${encodeQuery(`${query} book tickets`)}`
}

const suggestTransportBookingUrl = (transport) => {
  const mode = (transport.mode || transport.activityType || '').toLowerCase()
  const from = transport.departureLocation || transport.departureAirport || ''
  const to = transport.arrivalLocation || transport.arrivalAirport || ''

  if (mode === 'flight' || transport.activityType === 'flight') {
    const q = [from, to].filter(Boolean).join(' to ')
    return q
      ? `https://www.google.com/travel/flights?q=Flights%20${encodeQuery(q)}`
      : 'https://www.google.com/travel/flights'
  }
  if (mode === 'train' || transport.activityType === 'train' || transport.activityTypeId === 9) {
    return 'https://www.thetrainline.com'
  }
  if (mode === 'bus' || transport.activityType === 'bus' || transport.activityTypeId === 10) {
    return 'https://www.flixbus.com'
  }
  if (mode === 'car' || transport.activityType === 'car_rental') {
    const loc = to || from
    return loc
      ? `https://www.rentalcars.com/SearchResults.do?city=${encodeQuery(loc)}`
      : 'https://www.rentalcars.com'
  }
  return `https://www.google.com/search?q=${encodeQuery(`${from} ${to} transport booking`)}`
}

const suggestAccommodationBookingUrl = (accommodation, formData) => {
  const name = accommodation.name || accommodation.city || formData?.geographicZone || ''
  return `https://www.booking.com/searchresults.html?ss=${encodeQuery(name)}`
}

const normalizeGetYourGuideUrl = (url, item, formData = null) => {
  if (!url.hostname.toLowerCase().includes('getyourguide.com')) return url.toString()

  if (isGetYourGuideSearchUrl(url) && url.searchParams.get('q')) {
    return url.toString()
  }

  const query = buildActivitySearchQuery(item, formData)
  return renderSiteUrl(
    'https://www.getyourguide.com/s?q={{query}}',
    query
  )
}

const sanitizeBookingUrl = (rawUrl, item = {}, formData = null, kind = 'activity') => {
  const parsed = parseHttpUrl(rawUrl)
  if (!parsed) return null
  if (!isAllowedBookingHost(parsed)) return null

  if (parsed.hostname.toLowerCase().includes('getyourguide.com')) {
    return normalizeGetYourGuideUrl(parsed, item, formData)
  }

  return parsed.toString()
}

const verifyBookingUrlReachable = async (url) => {
  const parsed = parseHttpUrl(url)
  if (!parsed) return false

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), URL_VERIFY_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'TravelManager/1.0 (booking-url-check)' }
    })
    if (response.status === 405 || response.status === 501) {
      const getResponse = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'User-Agent': 'TravelManager/1.0 (booking-url-check)' }
      })
      return getResponse.status >= 200 && getResponse.status < 400
    }
    return response.status >= 200 && response.status < 400
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

const resolveBookingUrl = async (kind, item, formData = null) => {
  const fallback = () => {
    if (kind === 'transport') return suggestTransportBookingUrl(item)
    if (kind === 'accommodation') return suggestAccommodationBookingUrl(item, formData)
    return suggestActivityBookingUrl(item, formData)
  }

  if (!item?.bookingUrl) return fallback()

  const sanitized = sanitizeBookingUrl(item.bookingUrl, item, formData, kind)
  if (!sanitized) return fallback()

  const parsed = parseHttpUrl(sanitized)
  const isGygDeepLink = parsed
    && parsed.hostname.toLowerCase().includes('getyourguide.com')
    && !isGetYourGuideSearchUrl(parsed)

  if (isGygDeepLink) {
    const reachable = await verifyBookingUrlReachable(sanitized)
    if (!reachable) {
      return suggestActivityBookingUrl(item, formData)
    }
  }

  return sanitized
}

const suggestBookingUrl = (kind, item, formData = null) => {
  if (item?.bookingUrl) {
    const sanitized = sanitizeBookingUrl(item.bookingUrl, item, formData, kind)
    if (sanitized) return sanitized
  }
  if (kind === 'transport') return suggestTransportBookingUrl(item)
  if (kind === 'accommodation') return suggestAccommodationBookingUrl(item, formData)
  return suggestActivityBookingUrl(item, formData)
}

const normalizeItineraryBookingUrls = async (itinerary, formData = null) => {
  const enriched = { ...itinerary, stages: (itinerary.stages || []).map((s) => ({ ...s })) }

  if (enriched.outboundTransport?.bookingUrl) {
    enriched.outboundTransport = {
      ...enriched.outboundTransport,
      bookingUrl: await resolveBookingUrl('transport', enriched.outboundTransport, formData)
    }
  }

  if (enriched.returnTransport?.bookingUrl) {
    enriched.returnTransport = {
      ...enriched.returnTransport,
      bookingUrl: await resolveBookingUrl('transport', enriched.returnTransport, formData)
    }
  }

  for (const stage of enriched.stages) {
    if (stage.arrivalTransport?.bookingUrl) {
      stage.arrivalTransport = {
        ...stage.arrivalTransport,
        bookingUrl: await resolveBookingUrl('transport', stage.arrivalTransport, formData)
      }
    }

    stage.activities = await Promise.all((stage.activities || []).map(async (activity) => ({
      ...activity,
      bookingUrl: await resolveBookingUrl('activity', activity, formData)
    })))

    stage.accommodations = await Promise.all((stage.accommodations || []).map(async (accommodation) => ({
      ...accommodation,
      bookingUrl: await resolveBookingUrl('accommodation', accommodation, formData)
    })))
  }

  return enriched
}

module.exports = {
  suggestBookingUrl,
  suggestTransportBookingUrl,
  suggestAccommodationBookingUrl,
  suggestActivityBookingUrl,
  sanitizeBookingUrl,
  verifyBookingUrlReachable,
  resolveBookingUrl,
  normalizeItineraryBookingUrls,
  parseHttpUrl,
  isAllowedBookingHost
}
