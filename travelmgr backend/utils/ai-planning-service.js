const { geocodePlaces } = require('./geocoding')
const { scheduleItinerary } = require('./itinerary-scheduler')
const { suggestBookingUrl } = require('./booking-urls')

const ACTIVITY_TYPE_MAP = {
  restaurant: 1,
  museum: 2,
  tour: 3,
  shopping: 4,
  entertainment: 5,
  flight: 6,
  hotel: 7,
  car_rental: 8
}

const REQUIRED_FORM_FIELDS = [
  'departureLocation',
  'geographicZone',
  'durationDays',
  'travelStyle',
  'localTransport',
  'accommodationType',
  'budget',
  'currency'
]

const normalizeFormData = (formData = {}) => ({
  departureLocation: String(formData.departureLocation || '').trim(),
  geographicZone: String(formData.geographicZone || '').trim(),
  durationDays: Number(formData.durationDays) || 0,
  startDate: formData.startDate || null,
  travelStyle: String(formData.travelStyle || '').trim(),
  localTransport: String(formData.localTransport || '').trim(),
  accommodationType: String(formData.accommodationType || '').trim(),
  budget: Number(formData.budget) || 0,
  currency: String(formData.currency || 'EUR').trim().toUpperCase()
})

const isLikelySameRegion = (departure, destination) => {
  const dep = departure.toLowerCase()
  const dest = destination.toLowerCase()
  const regions = ['france', 'belgique', 'belgium', 'suisse', 'switzerland', 'luxembourg', 'paris', 'lyon', 'bruxelles']
  return regions.some((r) => dep.includes(r) && dest.includes(r))
}

const suggestOutboundTransportOptions = (formData) => {
  const sameRegion = isLikelySameRegion(formData.departureLocation, formData.geographicZone)
  const base = Math.round(formData.budget * 0.12)

  const options = sameRegion
    ? [
      { mode: 'train', label: 'Train', estimatedCost: Math.round(base * 0.7), durationHint: '2–5 h' },
      { mode: 'car', label: 'Voiture', estimatedCost: Math.round(base * 0.5), durationHint: 'flexible' },
      { mode: 'bus', label: 'Bus / car partagé', estimatedCost: Math.round(base * 0.35), durationHint: '3–8 h' }
    ]
    : [
      { mode: 'flight', label: 'Avion', estimatedCost: Math.round(base * 1.4), durationHint: '1–12 h' },
      { mode: 'train', label: 'Train (dont international)', estimatedCost: Math.round(base * 1.1), durationHint: '4–15 h' },
      { mode: 'car', label: 'Voiture (road trip)', estimatedCost: Math.round(base * 0.9), durationHint: 'long' }
    ]

  return {
    options,
    recommended: options[0]
  }
}

const validateFormData = (rawFormData) => {
  const formData = normalizeFormData(rawFormData)
  const errors = []
  const warnings = []

  if (!formData.departureLocation || formData.departureLocation.length < 2) {
    errors.push('Le lieu de départ est requis (ex. Bruxelles, Paris CDG, Genève).')
  }

  if (!formData.geographicZone || formData.geographicZone.length < 2) {
    errors.push('La zone géographique est requise (ex. Provence, Japon, Costa Rica).')
  }

  if (!Number.isInteger(formData.durationDays) || formData.durationDays < 1) {
    errors.push('La durée doit être un nombre entier d\'au moins 1 jour.')
  } else if (formData.durationDays > 90) {
    errors.push('La durée maximale prise en charge est de 90 jours.')
  }

  if (!formData.travelStyle) {
    errors.push('Le style de voyage est requis (ex. culturel, plage, montagne, repos).')
  }

  if (!formData.localTransport) {
    errors.push('Le mode de déplacement sur place est requis.')
  }

  if (!formData.accommodationType) {
    errors.push('Le type de séjour est requis (hôtel, Airbnb, camping, etc.).')
  }

  if (!formData.budget || formData.budget <= 0) {
    errors.push('Le budget estimé doit être supérieur à 0.')
  }

  if (!formData.currency || formData.currency.length !== 3) {
    errors.push('La devise doit être un code ISO à 3 lettres (ex. EUR, USD).')
  }

  if (formData.departureLocation.toLowerCase() === formData.geographicZone.toLowerCase()) {
    warnings.push('Le lieu de départ et la destination semblent identiques.')
  }

  const styleLower = formData.travelStyle.toLowerCase()
  const transportLower = formData.localTransport.toLowerCase()
  const accommodationLower = formData.accommodationType.toLowerCase()

  if (formData.durationDays <= 2 && (styleLower.includes('road trip') || styleLower.includes('tour'))) {
    warnings.push('Un road trip ou circuit complet est difficile à tenir en moins de 3 jours.')
  }

  if (formData.durationDays >= 14 && styleLower.includes('repos') && formData.budget / formData.durationDays < 80) {
    warnings.push('Le budget journalier semble bas pour un séjour long axé repos.')
  }

  if (accommodationLower.includes('camping') && formData.durationDays > 21) {
    warnings.push('Un camping prolongé peut nécessiter plus de préparation logistique.')
  }

  if (transportLower.includes('voiture') && styleLower.includes('ville')) {
    warnings.push('En ville, la voiture peut être contraignante ; vérifiez le stationnement.')
  }

  if (formData.budget / formData.durationDays < 40) {
    warnings.push('Le budget journalier est très serré pour couvrir hébergement, repas et activités.')
  }

  if (formData.startDate) {
    const start = new Date(formData.startDate)
    if (Number.isNaN(start.getTime())) {
      errors.push('La date de départ indiquée n\'est pas valide.')
    } else if (start < new Date(new Date().toDateString())) {
      warnings.push('La date de départ est dans le passé ; elle sera ignorée pour la planification.')
    }
  }

  return {
    isValid: errors.length === 0,
    formData,
    errors,
    warnings
  }
}

const buildSynthesisText = (formData, warnings) => {
  const dailyBudget = Math.round(formData.budget / formData.durationDays)
  const startHint = formData.startDate
    ? ` à partir du ${formData.startDate}`
    : ' (date de départ flexible)'
  const transport = suggestOutboundTransportOptions(formData)

  return {
    title: `Voyage ${formData.geographicZone}`,
    summary: [
      `Départ : ${formData.departureLocation}.`,
      `Destination : ${formData.geographicZone}${startHint}.`,
      `Durée : ${formData.durationDays} jour(s).`,
      `Style : ${formData.travelStyle}.`,
      `Transport recommandé vers la destination : ${transport.recommended.label} (~${transport.recommended.estimatedCost} ${formData.currency}).`,
      `Déplacement sur place : ${formData.localTransport}.`,
      `Hébergement : ${formData.accommodationType}.`,
      `Budget total : ${formData.budget} ${formData.currency} (~${dailyBudget} ${formData.currency}/jour).`
    ].join('\n'),
    highlights: [
      formData.departureLocation,
      formData.travelStyle,
      transport.recommended.label,
      formData.localTransport,
      formData.accommodationType
    ],
    warnings,
    estimatedDailyBudget: dailyBudget,
    outboundTransportOptions: transport.options,
    recommendedOutboundTransport: transport.recommended
  }
}

const addDays = (dateStr, days) => {
  const date = new Date(dateStr)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

const defaultStartDate = (formData) => {
  if (formData.startDate) {
    const start = new Date(formData.startDate)
    if (!Number.isNaN(start.getTime()) && start >= new Date(new Date().toDateString())) {
      return formData.startDate
    }
  }
  const future = new Date()
  future.setDate(future.getDate() + 30)
  return future.toISOString().slice(0, 10)
}

const buildImageUrl = (keyword, index) =>
  `https://picsum.photos/seed/${encodeURIComponent(keyword)}-${index}/800/400`

const buildFallbackItinerary = (formData, revisionFeedback) => {
  const startDate = defaultStartDate(formData)
  const endDate = addDays(startDate, formData.durationDays - 1)
  const zone = formData.geographicZone
  const style = formData.travelStyle
  const transport = suggestOutboundTransportOptions(formData)
  const outbound = transport.recommended
  const returnTransport = { ...outbound, label: `Retour ${outbound.label}` }

  const stages = []
  const segmentDays = Math.max(1, Math.ceil(formData.durationDays / 2))
  const stageCount = Math.ceil(formData.durationDays / segmentDays)
  const lodgingBudget = Math.round(formData.budget * 0.35 / stageCount)
  const activityBudgetPerDay = Math.round((formData.budget * 0.25) / formData.durationDays)
  const localTransportBudget = Math.round(formData.budget * 0.08)

  for (let i = 0; i < formData.durationDays; i += segmentDays) {
    const stageStart = addDays(startDate, i)
    const stageEnd = addDays(startDate, Math.min(i + segmentDays - 1, formData.durationDays - 1))
    const stageName = i === 0 ? zone.split(',')[0].trim() : `${zone.split(',')[0].trim()} — étape ${Math.floor(i / segmentDays) + 1}`

    const activities = []
    for (let day = i; day < Math.min(i + segmentDays, formData.durationDays); day += 1) {
      const dayDate = addDays(startDate, day)
      activities.push({
        name: `Jour ${day + 1} — ${style.includes('plage') ? 'Détente et balades' : 'Découverte locale'}`,
        activityType: style.includes('museum') || style.includes('culturel') ? 'museum' : 'tour',
        startDateTime: `${dayDate}T09:00:00Z`,
        endDateTime: `${dayDate}T18:00:00Z`,
        city: stageName,
        comments: `Activité proposée pour un séjour ${style}.`,
        estimatedCost: activityBudgetPerDay
      })
    }

    stages.push({
      name: stageName,
      countryCode: null,
      startDate: stageStart,
      endDate: stageEnd,
      latitude: null,
      longitude: null,
      arrivalTransport: null,
      activities,
      accommodations: [{
        name: `Hébergement type ${formData.accommodationType} — ${stageName}`,
        type: formData.accommodationType,
        checkInDate: stageStart,
        checkOutDate: addDays(stageEnd, 1),
        estimatedCost: lodgingBudget,
        latitude: null,
        longitude: null
      }]
    })
  }

  const outboundTransport = {
    mode: outbound.mode,
    label: `${outbound.label} : ${formData.departureLocation} → ${zone}`,
    description: `Trajet aller depuis ${formData.departureLocation} vers ${zone} (${outbound.durationHint}).`,
    estimatedCost: outbound.estimatedCost,
    departureLocation: formData.departureLocation,
    arrivalLocation: zone.split(',')[0].trim(),
    activityType: outbound.mode === 'flight' ? 'flight' : outbound.mode === 'car' ? 'car_rental' : 'tour'
  }

  const returnTransportLeg = {
    mode: returnTransport.mode,
    label: `${returnTransport.label} : ${zone} → ${formData.departureLocation}`,
    description: `Trajet retour vers ${formData.departureLocation}.`,
    estimatedCost: returnTransport.estimatedCost,
    departureLocation: zone.split(',')[0].trim(),
    arrivalLocation: formData.departureLocation,
    activityType: returnTransport.mode === 'flight' ? 'flight' : returnTransport.mode === 'car' ? 'car_rental' : 'tour'
  }

  const transportRoute = [
    outboundTransport.description,
    `Sur place : ${formData.localTransport} (~${localTransportBudget} ${formData.currency}).`,
    returnTransportLeg.description
  ].join(' ')

  const budgetBreakdown = [
    { category: 'transport_outbound', name: outboundTransport.label, estimatedCost: outboundTransport.estimatedCost, date: startDate },
    { category: 'transport_return', name: returnTransportLeg.label, estimatedCost: returnTransportLeg.estimatedCost, date: endDate },
    { category: 'transport_local', name: `Transport local (${formData.localTransport})`, estimatedCost: localTransportBudget },
    ...stages.flatMap((s) => s.accommodations.map((a) => ({
      category: 'accommodation',
      name: a.name,
      estimatedCost: a.estimatedCost,
      date: a.checkInDate
    }))),
    ...stages.flatMap((s) => s.activities.map((a) => ({
      category: 'activity',
      name: a.name,
      estimatedCost: a.estimatedCost,
      date: a.startDateTime.slice(0, 10)
    })))
  ]

  const dayLines = []
  for (let d = 0; d < formData.durationDays; d += 1) {
    const dayDate = addDays(startDate, d)
    dayLines.push(`**Jour ${d + 1} (${dayDate})** : exploration de ${zone}, activités ${style} (~${activityBudgetPerDay} ${formData.currency}), retour à l'hébergement.`)
  }

  let textItinerary = [
    `# Itinéraire proposé — ${zone}`,
    '',
    `**Départ** : ${formData.departureLocation}`,
    `**Durée** : ${formData.durationDays} jours (${startDate} → ${endDate})`,
    `**Style** : ${style}`,
    `**Budget total** : ${formData.budget} ${formData.currency}`,
    '',
    '## Trajets',
    `- Aller : ${outboundTransport.label} — **${outboundTransport.estimatedCost} ${formData.currency}**`,
    `- Sur place : ${formData.localTransport} — **${localTransportBudget} ${formData.currency}**`,
    `- Retour : ${returnTransportLeg.label} — **${returnTransportLeg.estimatedCost} ${formData.currency}**`,
    '',
    '## Programme jour par jour',
    ...dayLines,
    '',
    '## Hébergements suggérés',
    ...stages.flatMap((s) => s.accommodations.map((a) => `- ${a.name} (${a.checkInDate} → ${a.checkOutDate}) — **${a.estimatedCost} ${formData.currency}**`))
  ].join('\n')

  if (revisionFeedback) {
    textItinerary += `\n\n---\n*Révision demandée : ${revisionFeedback}*`
  }

  const imageKeywords = [zone.split(',')[0].trim(), style.split(' ')[0], 'travel']
  const images = imageKeywords.map((kw, idx) => ({
    url: buildImageUrl(kw, idx),
    caption: `${kw} — inspiration voyage`
  }))

  return {
    title: `Voyage ${zone}`,
    textItinerary,
    images,
    transportRoute,
    outboundTransport,
    returnTransport: returnTransportLeg,
    budgetBreakdown,
    mapPoints: [],
    routeSegments: [],
    trip: {
      name: `Voyage ${zone} (${formData.durationDays}j)`,
      description: `Voyage planifié par IA — ${style}. ${transportRoute}`,
      startDate,
      endDate,
      budget: formData.budget,
      currency: formData.currency
    },
    stages
  }
}

const parseJsonFromContent = (content) => {
  const trimmed = content.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const jsonText = fenced ? fenced[1].trim() : trimmed
  return JSON.parse(jsonText)
}

const buildPlanningPrompt = (formData, mode, previousItinerary, revisionFeedback) => {
  const baseContext = `
Tu es un agent de planification de voyages pour l'application Travel Manager.
Réponds UNIQUEMENT en JSON valide, sans markdown autour.

Données du voyage :
- Lieu de départ : ${formData.departureLocation}
- Zone / destination : ${formData.geographicZone}
- Durée : ${formData.durationDays} jours
- Date de départ souhaitée : ${formData.startDate || 'flexible'}
- Style : ${formData.travelStyle}
- Transport local sur place : ${formData.localTransport}
- Hébergement : ${formData.accommodationType}
- Budget total : ${formData.budget} ${formData.currency}
`

  if (mode === 'synthesis') {
    return `${baseContext}

Propose des moyens de transport depuis le lieu de départ vers la destination (avion, train, voiture, bus...) et vérifie la cohérence du voyage.

Génère une synthèse avec cette structure exacte :
{
  "title": "string",
  "summary": "string (paragraphe récapitulatif en français)",
  "highlights": ["string"],
  "warnings": ["string"],
  "estimatedDailyBudget": number,
  "outboundTransportOptions": [
    { "mode": "flight|train|car|bus", "label": "string", "estimatedCost": number, "durationHint": "string" }
  ],
  "recommendedOutboundTransport": { "mode": "string", "label": "string", "estimatedCost": number, "durationHint": "string" }
}`
  }

  const revisionBlock = revisionFeedback
    ? `\nL'utilisateur demande une révision. Feedback : "${revisionFeedback}"\nItinéraire précédent : ${JSON.stringify(previousItinerary)}\n`
    : ''

  return `${baseContext}${revisionBlock}

Génère un itinéraire complet avec budgets estimés pour CHAQUE élément et coordonnées géographiques approximatives (latitude/longitude).

Structure JSON exacte :
{
  "title": "string",
  "textItinerary": "string (markdown français, avec coûts indiqués)",
  "imageKeywords": ["mot-clé1", "mot-clé2"],
  "transportRoute": "string",
  "outboundTransport": {
    "mode": "flight|train|car|bus",
    "label": "string",
    "description": "string",
    "estimatedCost": number,
    "departureLocation": "string",
    "arrivalLocation": "string",
    "activityType": "flight|car_rental|tour"
  },
  "returnTransport": { "idem outboundTransport pour le retour, departureLocation = dernière étape sur place" },
  "budgetBreakdown": [
    { "category": "transport_outbound|transport_return|transport_local|accommodation|activity", "name": "string", "estimatedCost": number, "date": "YYYY-MM-DD optionnel" }
  ],
  "trip": { "name": "string", "description": "string", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "budget": number, "currency": "EUR" },
  "stages": [
    {
      "name": "string",
      "countryCode": "FR",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "latitude": number,
      "longitude": number,
      "arrivalTransport": {
        "mode": "flight|train|car|bus",
        "label": "string",
        "description": "string",
        "estimatedCost": number,
        "departureLocation": "ville précédente ou lieu de départ",
        "arrivalLocation": "ville de l'étape",
        "activityType": "flight|car_rental|tour",
        "startDateTime": "ISO8601",
        "endDateTime": "ISO8601",
        "reservationStatus": "to_reserve",
        "bookingUrl": "string optionnel"
      },
      "activities": [
        {
          "name": "string",
          "activityType": "museum|tour|restaurant|entertainment|hotel|flight|car_rental",
          "startDateTime": "YYYY-MM-DDTHH:mm:ssZ",
          "endDateTime": "YYYY-MM-DDTHH:mm:ssZ",
          "city": "string",
          "comments": "string",
          "estimatedCost": number,
          "latitude": number,
          "longitude": number,
          "reservationStatus": "to_reserve|reserved",
          "bookingUrl": "string optionnel"
        }
      ],
      "accommodations": [
        {
          "name": "string",
          "type": "string",
          "checkInDate": "YYYY-MM-DD",
          "checkOutDate": "YYYY-MM-DD",
          "estimatedCost": number,
          "latitude": number,
          "longitude": number,
          "reservationStatus": "to_reserve|reserved",
          "bookingUrl": "string optionnel"
        }
      ]
    }
  ]
}

Règles obligatoires :
- Chaque changement de lieu (étape) doit avoir un arrivalTransport depuis la ville précédente (sauf la 1ère qui utilise outboundTransport).
- Le returnTransport part de la DERNIÈRE ville visitée, jamais d'une autre ville.
- Toutes les activités d'une étape commencent APRÈS endDateTime de l'arrivalTransport de cette étape.
- reservationStatus par défaut : "to_reserve" pour transports, activités et hébergements.
La somme des estimatedCost doit rester proche du budget total.`
}

const callOpenAI = async (prompt) => {
  const { OpenAI } = require('openai')
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: 'Tu es un expert en planification de voyages. Tu réponds uniquement en JSON valide avec budgets et coordonnées GPS.'
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.4,
    max_tokens: 6000,
    response_format: { type: 'json_object' }
  })

  return parseJsonFromContent(response.choices[0].message.content)
}

const isOpenAIEnabled = () =>
  process.env.OPENAI_API_KEY && process.env.USE_OPENAI === 'true'

const generateSynthesis = async (formData) => {
  if (isOpenAIEnabled()) {
    try {
      const result = await callOpenAI(buildPlanningPrompt(formData, 'synthesis'))
      return { ...result, source: 'openai' }
    } catch (error) {
      console.error('OpenAI synthesis error:', error.message)
    }
  }

  const validation = validateFormData(formData)
  return {
    ...buildSynthesisText(validation.formData, validation.warnings),
    source: 'fallback'
  }
}

const enrichItineraryImages = (itinerary) => {
  const keywords = itinerary.imageKeywords || [itinerary.title || 'travel']
  const images = keywords.slice(0, 4).map((kw, idx) => ({
    url: buildImageUrl(kw, idx),
    caption: kw
  }))
  return { ...itinerary, images }
}

const ensureBudgetBreakdown = (itinerary, formData) => {
  if (itinerary.budgetBreakdown?.length) {
    return itinerary.budgetBreakdown
  }

  const items = []
  if (itinerary.outboundTransport?.estimatedCost) {
    items.push({
      category: 'transport_outbound',
      name: itinerary.outboundTransport.label,
      estimatedCost: itinerary.outboundTransport.estimatedCost
    })
  }
  if (itinerary.returnTransport?.estimatedCost) {
    items.push({
      category: 'transport_return',
      name: itinerary.returnTransport.label,
      estimatedCost: itinerary.returnTransport.estimatedCost
    })
  }

  for (const stage of itinerary.stages || []) {
    for (const acc of stage.accommodations || []) {
      if (acc.estimatedCost) {
        items.push({ category: 'accommodation', name: acc.name, estimatedCost: acc.estimatedCost, date: acc.checkInDate })
      }
    }
    for (const act of stage.activities || []) {
      if (act.estimatedCost) {
        items.push({ category: 'activity', name: act.name, estimatedCost: act.estimatedCost, date: act.startDateTime?.slice(0, 10) })
      }
    }
  }

  if (items.length === 0) {
    return buildFallbackItinerary(formData).budgetBreakdown
  }

  return items
}

const enrichItineraryGeoAndBudget = async (itinerary, formData) => {
  const enriched = { ...itinerary }
  enriched.budgetBreakdown = ensureBudgetBreakdown(enriched, formData)

  const places = [
    formData.departureLocation,
    formData.geographicZone,
    enriched.outboundTransport?.departureLocation,
    enriched.outboundTransport?.arrivalLocation,
    enriched.returnTransport?.departureLocation,
    enriched.returnTransport?.arrivalLocation
  ]

  for (const stage of enriched.stages || []) {
    places.push(stage.name)
    for (const act of stage.activities || []) places.push(act.city || stage.name)
    for (const acc of stage.accommodations || []) places.push(acc.name)
  }

  const geoMap = await geocodePlaces(places)

  const point = (label, type, extra = {}) => {
    const coords = geoMap[label] || null
    if (!coords) return null
    return {
      lat: coords.lat,
      lng: coords.lng,
      label,
      type,
      ...extra
    }
  }

  const mapPoints = []
  const routeSegments = []

  const depPoint = point(formData.departureLocation, 'departure', {
    transportMode: enriched.outboundTransport?.mode,
    estimatedCost: enriched.outboundTransport?.estimatedCost
  })
  if (depPoint) mapPoints.push(depPoint)

  const stagePoints = []
  for (const stage of enriched.stages || []) {
    let stagePoint = null
    if (stage.latitude && stage.longitude) {
      stagePoint = { lat: stage.latitude, lng: stage.longitude, label: stage.name, type: 'stage' }
    } else {
      stagePoint = point(stage.name, 'stage')
    }
    if (stagePoint) {
      stagePoints.push(stagePoint)
      mapPoints.push(stagePoint)
    }

    if (!stage.latitude && stagePoint) {
      stage.latitude = stagePoint.lat
      stage.longitude = stagePoint.lng
    }

    for (const act of stage.activities || []) {
      let actPoint = null
      if (act.latitude && act.longitude) {
        actPoint = { lat: act.latitude, lng: act.longitude, label: act.name, type: 'activity', estimatedCost: act.estimatedCost, transportMode: act.activityType }
      } else {
        actPoint = point(act.city || stage.name, 'activity', { estimatedCost: act.estimatedCost, transportMode: act.activityType })
      }
      if (actPoint) {
        mapPoints.push({ ...actPoint, label: act.name })
        if (!act.latitude && actPoint) {
          act.latitude = actPoint.lat
          act.longitude = actPoint.lng
        }
      }
    }

    for (const acc of stage.accommodations || []) {
      let accPoint = null
      if (acc.latitude && acc.longitude) {
        accPoint = { lat: acc.latitude, lng: acc.longitude, label: acc.name, type: 'accommodation', estimatedCost: acc.estimatedCost }
      } else {
        accPoint = point(acc.name, 'accommodation', { estimatedCost: acc.estimatedCost })
      }
      if (accPoint) mapPoints.push(accPoint)
    }
  }

  const destPoint = stagePoints[0] || point(formData.geographicZone.split(',')[0].trim(), 'stage')
  if (depPoint && destPoint && enriched.outboundTransport) {
    routeSegments.push({
      from: depPoint,
      to: destPoint,
      transportMode: enriched.outboundTransport.mode,
      estimatedCost: enriched.outboundTransport.estimatedCost,
      label: enriched.outboundTransport.label
    })
  }

  for (let i = 0; i < stagePoints.length - 1; i += 1) {
    const interTransport = enriched.stages?.[i + 1]?.arrivalTransport
    routeSegments.push({
      from: stagePoints[i],
      to: stagePoints[i + 1],
      transportMode: interTransport?.mode || (formData.localTransport.includes('voiture') ? 'car' : 'train'),
      estimatedCost: interTransport?.estimatedCost || Math.round(formData.budget * 0.03),
      label: interTransport?.label || `${stagePoints[i].label} → ${stagePoints[i + 1].label}`
    })
  }

  const lastStage = stagePoints[stagePoints.length - 1] || destPoint
  if (lastStage && depPoint && enriched.returnTransport) {
    routeSegments.push({
      from: lastStage,
      to: depPoint,
      transportMode: enriched.returnTransport.mode,
      estimatedCost: enriched.returnTransport.estimatedCost,
      label: enriched.returnTransport.label
    })
  }

  enriched.mapPoints = mapPoints
  enriched.routeSegments = routeSegments
  return enriched
}

const generateItinerary = async (formData, revisionFeedback, previousItinerary) => {
  let itinerary

  if (isOpenAIEnabled()) {
    try {
      itinerary = await callOpenAI(
        buildPlanningPrompt(formData, 'itinerary', previousItinerary, revisionFeedback)
      )
      itinerary = enrichItineraryImages(itinerary)
      itinerary.source = 'openai'
    } catch (error) {
      console.error('OpenAI itinerary error:', error.message)
    }
  }

  if (!itinerary) {
    itinerary = { ...buildFallbackItinerary(formData, revisionFeedback), source: 'fallback' }
  }

  itinerary = scheduleItinerary(itinerary, formData)
  itinerary = await enrichItineraryGeoAndBudget(itinerary, formData)

  if (itinerary.outboundTransport && !itinerary.outboundTransport.bookingUrl) {
    itinerary.outboundTransport.bookingUrl = suggestBookingUrl('transport', itinerary.outboundTransport, formData)
  }
  if (itinerary.returnTransport && !itinerary.returnTransport.bookingUrl) {
    itinerary.returnTransport.bookingUrl = suggestBookingUrl('transport', itinerary.returnTransport, formData)
  }

  return itinerary
}

const getActivityTypeId = (type) => ACTIVITY_TYPE_MAP[type] || ACTIVITY_TYPE_MAP.tour

module.exports = {
  validateFormData,
  generateSynthesis,
  generateItinerary,
  getActivityTypeId,
  normalizeFormData,
  buildSynthesisText,
  suggestOutboundTransportOptions,
  ACTIVITY_TYPE_MAP
}
