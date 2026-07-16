const fs = require('fs')
const path = require('path')
const { getLanguageLabel } = require('./auth-helpers')
const { ACTIVITY_TYPE_LABELS } = require('./trip-snapshot')
const { getActivityTypeId } = require('./activity-types')
const { suggestBookingUrl } = require('./booking-urls')
const { parseDateOnly, addDays } = require('./date-only')
const { extractStageCity, locationsCompatible } = require('./trip-location-validation')

const DEFAULT_CONFIG_PATH = path.join(__dirname, '..', 'config', 'ai-adapt-prompts.json')

let cache = { mtimeMs: 0, config: null }

const loadAdaptPromptsConfig = () => {
  const configPath = process.env.AI_ADAPT_PROMPTS_PATH || DEFAULT_CONFIG_PATH
  const stat = fs.statSync(configPath)
  if (cache.config && cache.mtimeMs === stat.mtimeMs) return cache.config
  cache = { mtimeMs: stat.mtimeMs, config: JSON.parse(fs.readFileSync(configPath, 'utf8')) }
  return cache.config
}

const renderTemplate = (template, variables) =>
  String(template || '').replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = variables[key]
    return value == null ? '' : String(value)
  })

const isOpenAIEnabled = () =>
  process.env.OPENAI_API_KEY && process.env.USE_OPENAI === 'true'

const parseJsonFromContent = (content) => {
  const trimmed = content.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  return JSON.parse(fenced ? fenced[1].trim() : trimmed)
}

const ACTIVITY_DETAIL_FIELDS = [
  'address', 'phone', 'checkInDate', 'checkOutDate', 'roomType', 'confirmationNumber',
  'airline', 'flightNumber', 'departureAirport', 'arrivalAirport', 'confirmationCode',
  'seat', 'gate', 'terminal', 'departureLocation', 'arrivalLocation',
  'company', 'pickupLocation', 'dropoffLocation', 'carType', 'bookingUrl', 'bookingCode',
  'transportLine', 'transportChanges'
]

const mergeActivityDetailFields = (change, data = {}) => {
  const merged = { ...data }
  for (const field of ACTIVITY_DETAIL_FIELDS) {
    if (change[field] != null && change[field] !== '') merged[field] = change[field]
    if (change.data?.[field] != null && change.data[field] !== '') merged[field] = change.data[field]
  }
  if (change.location) merged.city = change.location
  if (change.startDateTime) merged.startDateTime = change.startDateTime
  if (change.endDateTime) merged.endDateTime = change.endDateTime
  if (change.estimatedCost != null) merged.cost = change.estimatedCost
  if (change.description && !merged.comments) merged.comments = change.description
  return merged
}

const buildCompactSnapshot = (snapshot) => ({
  trip: {
    id: snapshot.trip.id,
    name: snapshot.trip.name,
    description: snapshot.trip.description,
    startDate: snapshot.trip.startDate,
    endDate: snapshot.trip.endDate,
    budget: snapshot.trip.budget,
    currency: snapshot.trip.currency,
    departureLocation: snapshot.trip.departureLocation
  },
  stages: snapshot.stages.map((stage) => ({
    id: stage.id,
    name: stage.name,
    countryId: stage.countryId,
    startDate: stage.startDate,
    endDate: stage.endDate,
    activities: (stage.activities || []).map((a) => ({
      id: a.id,
      activityTypeId: a.activityTypeId,
      activityType: ACTIVITY_TYPE_LABELS[a.activityTypeId] || 'tour',
      name: a.name,
      startDateTime: a.startDateTime,
      endDateTime: a.endDateTime,
      city: a.city,
      address: a.address,
      cost: a.cost,
      reservationStatus: a.reservationStatus,
      departureLocation: a.departureLocation,
      arrivalLocation: a.arrivalLocation,
      flightNumber: a.flightNumber,
      airline: a.airline,
      departureAirport: a.departureAirport,
      arrivalAirport: a.arrivalAirport,
      confirmationCode: a.confirmationCode,
      confirmationNumber: a.confirmationNumber,
      checkInDate: a.checkInDate,
      checkOutDate: a.checkOutDate,
      company: a.company,
      pickupLocation: a.pickupLocation,
      dropoffLocation: a.dropoffLocation
    }))
  }))
})

const buildAdaptPrompt = (snapshot, adaptationRequest, language) => {
  const config = loadAdaptPromptsConfig()
  const languageLabel = getLanguageLabel(language)
  const languageBlock = renderTemplate(config.languageInstruction, { languageLabel })
  const compact = buildCompactSnapshot(snapshot)

  return `${languageBlock}

Voyage actuel (JSON) :
${JSON.stringify(compact, null, 2)}

Demande d'adaptation de l'utilisateur :
"${adaptationRequest}"

${config.proposeInstructions}

Structure JSON exacte :
${config.proposeJsonSchema}`
}

const callOpenAI = async (prompt, language) => {
  const config = loadAdaptPromptsConfig()
  const { OpenAI } = require('openai')
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const languageLabel = getLanguageLabel(language)

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: renderTemplate(config.systemMessage, { languageLabel })
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 6000,
    response_format: { type: 'json_object' }
  })

  return parseJsonFromContent(response.choices[0].message.content)
}

const detectReservedImpacts = (snapshot, proposedChanges) => {
  const { flattenActivities } = require('./trip-flatten')
  const activities = flattenActivities(snapshot)
  const activityMap = new Map(activities.map((a) => [a.id, a]))
  const impacts = []
  const seen = new Set()

  for (const change of proposedChanges?.changes || []) {
    if (change.entityType !== 'activity' || !change.entityId) continue
    const activity = activityMap.get(change.entityId)
    if (!activity || activity.reservationStatus !== 'reserved') continue
    if (seen.has(activity.id)) continue
    seen.add(activity.id)
    impacts.push({
      entityId: activity.id,
      entityType: 'activity',
      name: activity.name,
      reservationStatus: activity.reservationStatus,
      changeDescription: change.description || change.action,
      reason: change.description || `Modification proposée (${change.action})`
    })
  }

  for (const warning of proposedChanges?.reservedWarnings || []) {
    if (seen.has(warning.entityId)) continue
    const activity = activityMap.get(warning.entityId)
    if (!activity) continue
    seen.add(warning.entityId)
    impacts.push({
      entityId: warning.entityId,
      entityType: warning.entityType || 'activity',
      name: warning.name || activity.name,
      reservationStatus: activity.reservationStatus,
      changeDescription: warning.reason,
      reason: warning.reason
    })
  }

  return impacts
}

const normalizeProposedChanges = (raw) => {
  const changes = (raw?.changes || []).map((change) => {
    const data = mergeActivityDetailFields(change, change.data || {})
    if (change.activityType) data.activityType = change.activityType

    return {
      ...change,
      location: change.location || data.city || null,
      address: change.address || data.address || null,
      flightNumber: change.flightNumber || data.flightNumber || null,
      departureLocation: change.departureLocation || data.departureLocation || null,
      arrivalLocation: change.arrivalLocation || data.arrivalLocation || null,
      startDateTime: change.startDateTime || data.startDateTime || null,
      endDateTime: change.endDateTime || data.endDateTime || null,
      estimatedCost: change.estimatedCost ?? data.cost ?? null,
      activityType: change.activityType || data.activityType || null,
      description: change.description || data.comments || null,
      data
    }
  })

  return { ...raw, changes }
}

const STRIP_FROM_ACTIVITY_PAYLOAD = new Set([
  'activityType', 'estimatedCost', 'description', 'location',
  'entityType', 'entityId', 'action', 'data'
])

const normalizeHotelDates = (payload, activityTypeId) => {
  if (activityTypeId !== 7) return payload
  const next = { ...payload }
  if (!next.checkInDate && next.startDateTime) {
    next.checkInDate = parseDateOnly(next.startDateTime)
  }
  if (!next.checkOutDate && next.endDateTime) {
    next.checkOutDate = parseDateOnly(next.endDateTime)
  }
  if (next.checkInDate && !next.checkOutDate) {
    next.checkOutDate = addDays(next.checkInDate, 1)
  }
  if (next.checkInDate && next.checkOutDate && next.checkInDate === next.checkOutDate) {
    next.checkOutDate = addDays(next.checkInDate, 1)
  }
  if (next.checkInDate && !next.startDateTime) {
    next.startDateTime = `${next.checkInDate}T15:00:00.000Z`
  }
  if (next.checkOutDate && !next.endDateTime) {
    next.endDateTime = `${next.checkOutDate}T11:00:00.000Z`
  }
  return next
}

const sanitizeActivityPayload = (payload, activityTypeId) => {
  const cleaned = { ...payload }
  for (const key of STRIP_FROM_ACTIVITY_PAYLOAD) {
    delete cleaned[key]
  }
  if (cleaned.cost != null && cleaned.cost !== '') {
    const cost = Number(cleaned.cost)
    cleaned.cost = Number.isFinite(cost) ? cost : null
  }
  return normalizeHotelDates(cleaned, activityTypeId)
}

const resolveActivityTypeId = (change) => {
  const typeKey = change.activityType
    || change.data?.activityType
    || change.data?.activityTypeId
  if (typeof typeKey === 'number') return typeKey
  return getActivityTypeId(typeKey)
}

const resolveStageIdForActivityChange = (change, stages = []) => {
  const explicit = change.stageId ?? change.data?.stageId
  if (explicit != null && explicit !== '') {
    const id = Number.parseInt(String(explicit), 10)
    if (Number.isFinite(id) && stages.some((s) => s.id === id)) return id
  }

  const location = change.location || change.data?.city
  const day = parseDateOnly(
    change.startDateTime || change.checkInDate || change.data?.startDateTime
  )

  if (day) {
    const dateMatches = stages.filter((stage) => {
      const start = parseDateOnly(stage.startDate)
      const end = parseDateOnly(stage.endDate)
      return start && end && start <= day && day <= end
    })

    if (location && dateMatches.length > 0) {
      const byLocation = dateMatches.find((stage) =>
        locationsCompatible(location, extractStageCity(stage))
      )
      if (byLocation) return byLocation.id
    }

    if (dateMatches.length === 1) return dateMatches[0].id
    if (dateMatches.length > 0) return dateMatches[0].id
  }

  if (location) {
    const byLocation = stages.find((stage) =>
      locationsCompatible(location, extractStageCity(stage))
    )
    if (byLocation) return byLocation.id
  }

  return null
}

const buildActivityUpdates = (change, activity) => {
  const activityTypeId = resolveActivityTypeId(change) || activity.activityTypeId
  const merged = mergeActivityDetailFields(change, {
    ...(change.data || {}),
    city: change.location || change.data?.city || activity.city,
    startDateTime: change.startDateTime || change.data?.startDateTime || activity.startDateTime,
    endDateTime: change.endDateTime || change.data?.endDateTime || activity.endDateTime,
    cost: change.estimatedCost ?? change.data?.cost ?? activity.cost,
    comments: change.description || change.data?.comments || activity.comments,
    activityTypeId
  })
  return sanitizeActivityPayload(merged, activityTypeId)
}

const buildActivityCreatePayload = (change, stageId) => {
  const activityTypeId = resolveActivityTypeId(change)
  const merged = mergeActivityDetailFields(change, {
    ...(change.data || {}),
    stageId,
    activityTypeId,
    name: change.data?.name || change.description?.slice(0, 80) || 'Nouvelle activité',
    city: change.location || change.data?.city || null,
    startDateTime: change.startDateTime || change.data?.startDateTime || null,
    endDateTime: change.endDateTime || change.data?.endDateTime || null,
    cost: change.estimatedCost ?? change.data?.cost ?? null,
    comments: change.description || change.data?.comments || null,
    reservationStatus: change.data?.reservationStatus || 'to_reserve',
    bookingUrl: change.data?.bookingUrl || suggestBookingUrl('activity', change.data || {})
  })
  return sanitizeActivityPayload(merged, activityTypeId)
}

const proposeAdaptations = async (snapshot, adaptationRequest, language) => {
  if (!isOpenAIEnabled()) {
    return normalizeProposedChanges({
      summary: 'Adaptation IA indisponible (OpenAI non configuré).',
      changes: [],
      reservedWarnings: [],
      source: 'fallback'
    })
  }

  const prompt = buildAdaptPrompt(snapshot, adaptationRequest, language)
  const result = await callOpenAI(prompt, language)
  return normalizeProposedChanges({ ...result, source: 'openai' })
}

const applyProposedChanges = async (tripId, proposedChanges) => {
  const { Trip, Stage, Activity } = require('../models/DBmodels')
  const applied = { trip: 0, stages: 0, activities: 0 }
  const errors = []

  const existingStages = await Stage.findAll({ where: { tripId } })
  const defaultCountryId = existingStages[0]?.countryId || null

  for (const change of proposedChanges?.changes || []) {
    try {
      if (change.entityType === 'trip' && change.action === 'update') {
        const trip = await Trip.findByPk(tripId)
        if (trip) {
          await trip.update(change.data || {})
          applied.trip += 1
        }
      }

      if (change.entityType === 'stage') {
        if (change.action === 'update' && change.entityId) {
          const stage = await Stage.findByPk(change.entityId)
          if (stage && stage.tripId === tripId) {
            await stage.update(change.data || {})
            applied.stages += 1
          }
        }
        if (change.action === 'create') {
          const countryId = change.data?.countryId || defaultCountryId
          if (!countryId) {
            errors.push('Stage create skipped: missing countryId')
            continue
          }
          await Stage.create({
            ...(change.data || {}),
            tripId,
            countryId,
            name: change.data?.name || 'Nouvelle étape'
          })
          applied.stages += 1
        }
        if (change.action === 'delete' && change.entityId) {
          const stage = await Stage.findByPk(change.entityId)
          if (stage && stage.tripId === tripId) {
            await Activity.destroy({ where: { stageId: stage.id } })
            await stage.destroy()
            applied.stages += 1
          }
        }
      }

      if (change.entityType === 'activity') {
        if (change.action === 'update' && change.entityId) {
          const activity = await Activity.findByPk(change.entityId)
          if (!activity) continue
          const stage = await Stage.findByPk(activity.stageId)
          if (stage?.tripId !== tripId) continue
          const updates = buildActivityUpdates(change, activity)
          await activity.update(updates)
          applied.activities += 1
        }
        if (change.action === 'create') {
          const stageId = resolveStageIdForActivityChange(change, existingStages)
          if (!stageId) {
            errors.push(
              `Activity create skipped: missing stageId (location=${change.location || '?'})`
            )
            continue
          }
          const stage = await Stage.findByPk(stageId)
          if (!stage || stage.tripId !== tripId) {
            errors.push(`Activity create skipped: invalid stageId ${stageId}`)
            continue
          }
          const payload = buildActivityCreatePayload(change, stageId)
          await Activity.create(payload)
          applied.activities += 1
        }
        if (change.action === 'delete' && change.entityId) {
          const activity = await Activity.findByPk(change.entityId)
          if (!activity) continue
          const stage = await Stage.findByPk(activity.stageId)
          if (stage?.tripId === tripId) {
            await activity.destroy()
            applied.activities += 1
          }
        }
      }
    } catch (err) {
      errors.push(`${change.entityType} ${change.action} #${change.entityId || '?'}: ${err.message}`)
    }
  }

  if (errors.length > 0 && applied.trip + applied.stages + applied.activities === 0) {
    throw new Error(errors.join('; '))
  }

  return applied
}

module.exports = {
  proposeAdaptations,
  detectReservedImpacts,
  applyProposedChanges,
  buildAdaptPrompt,
  normalizeProposedChanges,
  resolveStageIdForActivityChange,
  buildActivityCreatePayload,
  sanitizeActivityPayload
}
