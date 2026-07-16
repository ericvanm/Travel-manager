const GENERIC_NAME_PATTERNS = [
  /^jour\s+\d+/i,
  /\bvisite\s+\d+\b/i,
  /\bactivit[ée]\s+\d+\b/i,
  /^d[ée]tente\s+\d+/i,
  /\(.*activit[ée]\s+\d+.*\)/i,
  /^exploration\s+de\s+/i
]

const extractPlaceName = (value) =>
  String(value || '')
    .split('—')[0]
    .split(',')[0]
    .trim()

const isGenericActivityName = (name) => {
  const normalized = String(name || '').trim()
  if (!normalized) return true
  return GENERIC_NAME_PATTERNS.some((pattern) => pattern.test(normalized))
}

const pickStyleKeyword = (formData) => {
  const style = String(formData?.travelStyle || 'visite')
  const keywords = style.split(/[,;]/).map((part) => part.trim()).filter(Boolean)
  return keywords[0] || 'visite'
}

const cleanActivityTitle = (name, city, formData = null) => {
  const place = extractPlaceName(city) || extractPlaceName(formData?.geographicZone) || 'destination'
  if (!isGenericActivityName(name)) {
    return String(name)
      .replace(/^jour\s+\d+\s*[—\-–]\s*/i, '')
      .replace(/\s*\([^)]*\)\s*$/g, '')
      .trim()
  }

  const style = String(formData?.travelStyle || '').toLowerCase()
  if (style.includes('restaurant')) return `Restaurant local — ${place}`
  if (style.includes('randonn')) return `Randonnée — ${place}`
  if (style.includes('village')) return `Visite de village — ${place}`
  if (style.includes('vin')) return `Dégustation de vin — ${place}`
  if (style.includes('museum') || style.includes('culturel')) return `Visite culturelle — ${place}`

  const keyword = pickStyleKeyword(formData)
  const label = keyword.charAt(0).toUpperCase() + keyword.slice(1)
  return `${label} — ${place}`
}

const buildActivitySearchQuery = (activity, formData = null) => {
  const city = extractPlaceName(activity?.city || activity?.arrivalLocation)
  const title = cleanActivityTitle(activity?.name, city, formData)
  const parts = [city, title].filter(Boolean)
  return parts.join(' ').trim() || city || 'activities'
}

const normalizeItineraryActivities = (itinerary, formData = null) => {
  const next = {
    ...itinerary,
    stages: (itinerary.stages || []).map((stage) => ({
      ...stage,
      activities: (stage.activities || []).map((activity) => {
        const city = activity.city || extractPlaceName(stage.name)
        const name = cleanActivityTitle(activity.name, city, formData)
        return { ...activity, name, city: city || activity.city }
      })
    }))
  }
  return next
}

module.exports = {
  isGenericActivityName,
  cleanActivityTitle,
  buildActivitySearchQuery,
  extractPlaceName,
  normalizeItineraryActivities
}
