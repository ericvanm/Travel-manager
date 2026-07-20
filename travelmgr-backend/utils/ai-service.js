const extractAllMatches = (text, pattern) => {
  const matches = []
  let match = pattern.exec(text)
  while (match !== null) {
    matches.push(match)
    match = pattern.exec(text)
  }
  pattern.lastIndex = 0
  return matches
}

const buildFlightNumberActivities = (text, dates) => {
  const pattern = /(?:vol|flight)\s+([A-Z]{2,3}\s*\d{3,4})/gi
  return extractAllMatches(text, pattern).map((match) => ({
    type: 'flight',
    name: match[0],
    startDateTime: dates[0] ? `${dates[0]}T12:00:00Z` : new Date().toISOString(),
    endDateTime: dates[0] ? `${dates[0]}T15:00:00Z` : new Date().toISOString(),
    details: {
      flightNumber: match[1] || '',
      departure: '',
      arrival: ''
    },
    confidence: 0.7
  }))
}

const buildFlightRouteActivities = (text, dates) => {
  const pattern = /([A-Z]{3})\s+(?:to|vers|→)\s+([A-Z]{3})/gi
  return extractAllMatches(text, pattern).map((match) => ({
    type: 'flight',
    name: match[0],
    startDateTime: dates[0] ? `${dates[0]}T12:00:00Z` : new Date().toISOString(),
    endDateTime: dates[0] ? `${dates[0]}T15:00:00Z` : new Date().toISOString(),
    details: {
      flightNumber: '',
      departure: match[1] || '',
      arrival: match[2] || ''
    },
    confidence: 0.7
  }))
}

const buildFlightActivities = (text, dates) => [
  ...buildFlightNumberActivities(text, dates),
  ...buildFlightRouteActivities(text, dates)
]

const buildHotelActivities = (text, dates) => {
  const patterns = [
    /(?:hôtel|hotel)\s*:?\s+([^\n\r]{5,50})/gi,
    /check-?in\s*:?\s+([^\n\r]{5,50})/gi,
    /check-?out\s*:?\s+([^\n\r]{5,50})/gi
  ]

  return patterns.flatMap((pattern) => extractAllMatches(text, pattern).map((match) => ({
    type: 'hotel',
    name: match[1].trim(),
    startDateTime: dates[0] ? `${dates[0]}T15:00:00Z` : new Date().toISOString(),
    endDateTime: dates[1] ? `${dates[1]}T11:00:00Z` : new Date().toISOString(),
    details: {},
    confidence: 0.6
  })))
}

const buildFallbackActivity = (text, dates) => ({
  type: 'activity',
  name: `${text.substring(0, 50).trim()}...`,
  startDateTime: dates[0] ? `${dates[0]}T10:00:00Z` : new Date().toISOString(),
  endDateTime: dates[0] ? `${dates[0]}T18:00:00Z` : new Date().toISOString(),
  details: {},
  confidence: 0.3
})

const uniqueValues = (values) => [...new Set(values)]

const analyzeWithPatterns = (text) => {
  const datePattern = /(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})|(\d{4}-\d{2}-\d{2})/g
  const locationPattern = /(?:à|in|at)\s+([A-Z][\wÀ-ÿ ]{2,30})/g
  const reservationPattern = /(?:réservation|booking|confirmation|ref):?\s+([A-Z0-9]{4,15})/gi

  const dates = extractAllMatches(text, datePattern).map((match) => match[0])
  const locations = extractAllMatches(text, locationPattern).map((match) => match[1].trim())
  const reservationNumbers = extractAllMatches(text, reservationPattern).map((match) => match[1])

  const activities = [
    ...buildFlightActivities(text, dates),
    ...buildHotelActivities(text, dates)
  ]

  if (activities.length === 0 && text.trim().length > 10) {
    activities.push(buildFallbackActivity(text, dates))
  }

  return {
    detectedActivities: activities,
    extractedInfo: {
      dates: uniqueValues(dates),
      locations: uniqueValues(locations),
      reservationNumbers: uniqueValues(reservationNumbers)
    }
  }
}

const analyzeWithOpenAI = async (text) => {
  try {
    const { OpenAI } = require('openai')
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const prompt = `
    Analyse ce document de réservation et extrait les informations structurées.
    Retourne UNIQUEMENT un JSON valide avec cette structure exacte :
    {
      "detectedActivities": [
        {
          "type": "flight|hotel|car_rental|restaurant|activity",
          "name": "string",
          "startDateTime": "YYYY-MM-DDTHH:mm:ssZ",
          "endDateTime": "YYYY-MM-DDTHH:mm:ssZ",
          "details": {},
          "confidence": 0.0-1.0
        }
      ],
      "extractedInfo": {
        "dates": ["YYYY-MM-DD"],
        "locations": ["string"],
        "reservationNumbers": ["string"]
      }
    }

    Texte à analyser:
    ${text}
    `

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 1000
    })

    return JSON.parse(response.choices[0].message.content)
  } catch (error) {
    console.error('Erreur OpenAI:', error)
    return analyzeWithPatterns(text)
  }
}

const analyzeReservationText = async (text) => {
  const useOpenAI = process.env.OPENAI_API_KEY && process.env.USE_OPENAI === 'true'
  if (useOpenAI) {
    return analyzeWithOpenAI(text)
  }
  return analyzeWithPatterns(text)
}

module.exports = {
  analyzeReservationText
}
