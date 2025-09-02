// Service IA pour l'analyse de documents de réservation
// Remplacer par votre API IA préférée (OpenAI, Claude, etc.)

const analyzeReservationText = async (text) => {
  // Configuration pour OpenAI (optionnel)
  const useOpenAI = process.env.OPENAI_API_KEY && process.env.USE_OPENAI === 'true'
  
  if (useOpenAI) {
    return await analyzeWithOpenAI(text)
  } else {
    return await analyzeWithPatterns(text)
  }
}

// Analyse avec OpenAI (nécessite clé API)
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
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 1000
    })
    
    const result = JSON.parse(response.choices[0].message.content)
    return result
  } catch (error) {
    console.error('Erreur OpenAI:', error)
    return analyzeWithPatterns(text)
  }
}

// Analyse avec patterns regex (fallback)
const analyzeWithPatterns = (text) => {
  const activities = []
  const dates = []
  const locations = []
  const reservationNumbers = []
  
  // Patterns de détection
  const patterns = {
    // Vols
    flight: /(?:vol|flight)\s*([A-Z]{2,3}\s*\d{3,4})|([A-Z]{3})\s*(?:to|vers|→)\s*([A-Z]{3})/gi,
    // Dates
    dates: /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})|(\d{4}-\d{2}-\d{2})/g,
    // Heures
    times: /(\d{1,2}[:h]\d{2})/g,
    // Hôtels
    hotel: /(?:hôtel|hotel|check.?in|check.?out)\s*:?\s*([^\n\r]{5,50})/gi,
    // Numéros de réservation
    reservation: /(?:réservation|booking|confirmation|ref)\s*:?\s*([A-Z0-9]{4,15})/gi,
    // Lieux
    locations: /(?:à|in|at)\s+([A-Z][a-zA-ZÀ-ÿ\s]{2,30})/g
  }
  
  // Extraction des dates
  let match
  while ((match = patterns.dates.exec(text)) !== null) {
    dates.push(match[0])
  }
  
  // Extraction des lieux
  while ((match = patterns.locations.exec(text)) !== null) {
    locations.push(match[1].trim())
  }
  
  // Extraction des numéros de réservation
  while ((match = patterns.reservation.exec(text)) !== null) {
    reservationNumbers.push(match[1])
  }
  
  // Détection des vols
  while ((match = patterns.flight.exec(text)) !== null) {
    activities.push({
      type: 'flight',
      name: match[0],
      startDateTime: dates[0] ? `${dates[0]}T12:00:00Z` : new Date().toISOString(),
      endDateTime: dates[0] ? `${dates[0]}T15:00:00Z` : new Date().toISOString(),
      details: {
        flightNumber: match[1] || '',
        departure: match[2] || '',
        arrival: match[3] || ''
      },
      confidence: 0.7
    })
  }
  
  // Détection des hôtels
  while ((match = patterns.hotel.exec(text)) !== null) {
    activities.push({
      type: 'hotel',
      name: match[1].trim(),
      startDateTime: dates[0] ? `${dates[0]}T15:00:00Z` : new Date().toISOString(),
      endDateTime: dates[1] ? `${dates[1]}T11:00:00Z` : new Date().toISOString(),
      details: {},
      confidence: 0.6
    })
  }
  
  // Si aucune activité détectée, créer une activité générique
  if (activities.length === 0 && text.trim().length > 10) {
    activities.push({
      type: 'activity',
      name: text.substring(0, 50).trim() + '...',
      startDateTime: dates[0] ? `${dates[0]}T10:00:00Z` : new Date().toISOString(),
      endDateTime: dates[0] ? `${dates[0]}T18:00:00Z` : new Date().toISOString(),
      details: {},
      confidence: 0.3
    })
  }
  
  return {
    detectedActivities: activities,
    extractedInfo: {
      dates: [...new Set(dates)],
      locations: [...new Set(locations)],
      reservationNumbers: [...new Set(reservationNumbers)]
    }
  }
}

module.exports = {
  analyzeReservationText
}