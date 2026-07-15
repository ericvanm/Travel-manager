const { geocodePlaces } = require('./geocoding')
const { scheduleItinerary } = require('./itinerary-scheduler')
const { suggestBookingUrl } = require('./booking-urls')
const {
  buildGeoQuery,
  extractStageCity,
  normalizeStageLocations,
  ensureDailyAccommodation,
  geocodeItineraryLocations,
  haversineKm
} = require('./itinerary-location-validator')
const {
  buildSynthesisPrompt,
  buildItineraryPrompt,
  getSystemMessage
} = require('./ai-planning-prompts')

const {
  ACTIVITY_TYPE_MAP,
  ACTIVITY_TYPE_LABELS,
  getActivityTypeId
} = require('./activity-types')

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
        city: stageName,
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

const buildPlanningPrompt = (formData, mode, previousItinerary, revisionFeedback, language = 'fr') => {
  if (mode === 'synthesis') {
    return buildSynthesisPrompt(formData, language)
  }
  return buildItineraryPrompt(formData, previousItinerary, revisionFeedback, language)
}

const callOpenAI = async (prompt, language = 'fr') => {
  const { OpenAI } = require('openai')
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: getSystemMessage(language)
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

const generateSynthesis = async (formData, language = 'fr') => {
  if (isOpenAIEnabled()) {
    try {
      const result = await callOpenAI(buildPlanningPrompt(formData, 'synthesis', null, null, language), language)
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
  const zone = formData.geographicZone || ''

  const queryEntries = []
  const addQuery = (query, meta) => {
    if (!query) return
    queryEntries.push({ query, ...meta })
  }

  addQuery(formData.departureLocation, { kind: 'departure' })
  addQuery(formData.geographicZone, { kind: 'zone' })

  for (const stage of enriched.stages || []) {
    const stageCity = extractStageCity(stage, formData)
    const stageQuery = buildGeoQuery({ city: stageCity, geographicZone: zone })
    addQuery(stageQuery, { kind: 'stage', stage, stageQuery })

    for (const act of stage.activities || []) {
      const q = buildGeoQuery({
        name: act.name,
        city: act.city || stageCity,
        stageName: stage.name,
        geographicZone: zone
      })
      addQuery(q, { kind: 'activity', stage, item: act, query: q })
    }

    for (const acc of stage.accommodations || []) {
      const q = buildGeoQuery({
        name: acc.name,
        city: acc.city || stageCity,
        stageName: stage.name,
        geographicZone: zone
      })
      addQuery(q, { kind: 'accommodation', stage, item: acc, query: q })
    }
  }

  const geoMap = await geocodePlaces(queryEntries.map((e) => e.query))
  const stageAnchors = new Map()

  for (const entry of queryEntries) {
    if (entry.kind !== 'stage') continue
    const coords = geoMap[entry.stageQuery]
    if (coords) stageAnchors.set(entry.stage, coords)
  }

  const resolveCoords = (entry) => {
    if (entry.item?.latitude != null && entry.item?.longitude != null) {
      return { lat: entry.item.latitude, lng: entry.item.longitude }
    }
    let coords = geoMap[entry.query]
    const anchor = stageAnchors.get(entry.stage)
    if (coords && anchor && haversineKm(anchor, coords) > 150) {
      coords = anchor
    }
    if (!coords && anchor) return anchor
    return coords
  }

  const pointFromEntry = (label, type, entry, extra = {}) => {
    const coords = resolveCoords(entry)
    if (!coords) return null
    return { lat: coords.lat, lng: coords.lng, label, type, ...extra }
  }

  const mapPoints = []
  const routeSegments = []

  const depCoords = geoMap[formData.departureLocation]
  const depPoint = depCoords
    ? { lat: depCoords.lat, lng: depCoords.lng, label: formData.departureLocation, type: 'departure',
        transportMode: enriched.outboundTransport?.mode, estimatedCost: enriched.outboundTransport?.estimatedCost }
    : null
  if (depPoint) mapPoints.push(depPoint)

  const stagePoints = []
  for (const stage of enriched.stages || []) {
    const stageEntry = queryEntries.find((e) => e.kind === 'stage' && e.stage === stage)
    let stagePoint = null
    if (stage.latitude && stage.longitude) {
      stagePoint = { lat: stage.latitude, lng: stage.longitude, label: stage.name, type: 'stage' }
    } else if (stageEntry) {
      stagePoint = pointFromEntry(stage.name, 'stage', stageEntry)
    }
    if (stagePoint) {
      stagePoints.push(stagePoint)
      mapPoints.push(stagePoint)
      if (!stage.latitude) {
        stage.latitude = stagePoint.lat
        stage.longitude = stagePoint.lng
      }
    }

    for (const act of stage.activities || []) {
      const entry = queryEntries.find((e) => e.kind === 'activity' && e.item === act)
      if (!entry) continue
      const actPoint = pointFromEntry(act.name, 'activity', entry, {
        estimatedCost: act.estimatedCost,
        transportMode: act.activityType
      })
      if (actPoint) {
        mapPoints.push(actPoint)
        if (!act.latitude) {
          act.latitude = actPoint.lat
          act.longitude = actPoint.lng
        }
      }
    }

    for (const acc of stage.accommodations || []) {
      const entry = queryEntries.find((e) => e.kind === 'accommodation' && e.item === acc)
      if (!entry) continue
      const accPoint = pointFromEntry(acc.name, 'accommodation', entry, { estimatedCost: acc.estimatedCost })
      if (accPoint) {
        mapPoints.push(accPoint)
        if (!acc.latitude) {
          acc.latitude = accPoint.lat
          acc.longitude = accPoint.lng
        }
      }
    }
  }

  const destPoint = stagePoints[0] || null
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

const generateItinerary = async (formData, revisionFeedback, previousItinerary, language = 'fr') => {
  let itinerary

  if (isOpenAIEnabled()) {
    try {
      itinerary = await callOpenAI(
        buildPlanningPrompt(formData, 'itinerary', previousItinerary, revisionFeedback, language),
        language
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
  itinerary = normalizeStageLocations(itinerary, formData)
  itinerary = ensureDailyAccommodation(itinerary, formData)
  itinerary = await geocodeItineraryLocations(itinerary, formData)
  itinerary = await enrichItineraryGeoAndBudget(itinerary, formData)

  if (itinerary.outboundTransport && !itinerary.outboundTransport.bookingUrl) {
    itinerary.outboundTransport.bookingUrl = suggestBookingUrl('transport', itinerary.outboundTransport, formData)
  }
  if (itinerary.returnTransport && !itinerary.returnTransport.bookingUrl) {
    itinerary.returnTransport.bookingUrl = suggestBookingUrl('transport', itinerary.returnTransport, formData)
  }

  return itinerary
}

module.exports = {
  validateFormData,
  generateSynthesis,
  generateItinerary,
  getActivityTypeId,
  normalizeFormData,
  buildSynthesisText,
  suggestOutboundTransportOptions,
  ACTIVITY_TYPE_MAP,
  ACTIVITY_TYPE_LABELS
}
