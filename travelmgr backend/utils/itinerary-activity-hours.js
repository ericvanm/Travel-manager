const { parseDateOnly, addDays, listDateRange } = require('./date-only')
const { cleanActivityTitle } = require('./activity-content')
const { formatInspirationSitesForPrompt } = require('./activity-inspiration-sites')
const { ensureActivityAfterArrival, getStageArrivalEnd } = require('./itinerary-scheduler')

const LEISURE_ACTIVITY_TYPES = new Set([
  'restaurant',
  'museum',
  'tour',
  'shopping',
  'entertainment'
])

const TRANSPORT_ACTIVITY_TYPES = new Set([
  'flight',
  'car_rental',
  'private_car',
  'train',
  'bus',
  'public_transport',
  'hotel'
])

const DEFAULT_SLOT_HOURS = 2

const isLeisureActivity = (activity) => {
  const type = String(activity?.activityType || '').toLowerCase()
  if (!type || TRANSPORT_ACTIVITY_TYPES.has(type)) return false
  return LEISURE_ACTIVITY_TYPES.has(type) || !TRANSPORT_ACTIVITY_TYPES.has(type)
}

const activityDurationHours = (activity, day = null) => {
  const start = activity?.startDateTime ? new Date(activity.startDateTime) : null
  const end = activity?.endDateTime ? new Date(activity.endDateTime) : null
  if (!start || Number.isNaN(start.getTime())) return 0

  if (!end || Number.isNaN(end.getTime()) || end <= start) {
    return DEFAULT_SLOT_HOURS
  }

  if (!day) {
    return Math.max(0, (end.getTime() - start.getTime()) / (60 * 60 * 1000))
  }

  const dayStart = new Date(`${day}T00:00:00Z`)
  const dayEnd = new Date(`${day}T23:59:59Z`)
  const overlapStart = Math.max(start.getTime(), dayStart.getTime())
  const overlapEnd = Math.min(end.getTime(), dayEnd.getTime())
  if (overlapEnd <= overlapStart) return 0
  return (overlapEnd - overlapStart) / (60 * 60 * 1000)
}

const activityOnDay = (activity, day) => {
  const startDay = activity?.startDateTime ? parseDateOnly(activity.startDateTime) : null
  const endDay = activity?.endDateTime ? parseDateOnly(activity.endDateTime) : null
  if (startDay === day || endDay === day) return true
  if (startDay && endDay && startDay <= day && day <= endDay) return true
  return false
}

const findStageForDate = (stages, day) => {
  for (const stage of stages || []) {
    const start = parseDateOnly(stage.startDate)
    const end = parseDateOnly(stage.endDate)
    if (start && end && start <= day && day <= end) return stage
  }
  return stages?.[0] || null
}

const extractStageCity = (stage) => {
  const name = stage?.name || ''
  return name.split('—')[0].split(',')[0].trim() || name.trim()
}

const computeDailyLeisureHours = (itinerary) => {
  const trip = itinerary?.trip || {}
  const start = parseDateOnly(trip.startDate)
  const end = parseDateOnly(trip.endDate)
  if (!start || !end) return {}

  const days = listDateRange(start, end)
  const totals = Object.fromEntries(days.map((d) => [d, 0]))

  for (const stage of itinerary.stages || []) {
    for (const activity of stage.activities || []) {
      if (!isLeisureActivity(activity)) continue
      for (const day of days) {
        if (activityOnDay(activity, day)) {
          totals[day] = (totals[day] || 0) + activityDurationHours(activity, day)
        }
      }
    }
  }

  return totals
}

const slotsNeededForDay = (currentHours, minHours, maxHours) => {
  if (currentHours >= minHours) return 0
  const target = Math.min(maxHours, Math.max(minHours, minHours))
  const deficit = target - currentHours
  return Math.max(1, Math.ceil(deficit / DEFAULT_SLOT_HOURS))
}

const buildFillerActivity = ({
  day,
  slotIndex,
  stage,
  formData,
  arrivalEndIso
}) => {
  const city = extractStageCity(stage)
  const style = formData.travelStyle || 'découverte'
  const inspirationHint = formatInspirationSitesForPrompt(formData)

  let startHour = 10
  if (arrivalEndIso) {
    const arrival = new Date(arrivalEndIso)
    const dayStart = new Date(`${day}T00:00:00Z`)
    if (parseDateOnly(arrivalEndIso) === day) {
      startHour = Math.min(18, Math.max(9, arrival.getUTCHours() + 1))
    } else if (arrival > dayStart) {
      startHour = 10
    }
  }
  const hour = startHour + slotIndex * 3

  const filler = {
    name: cleanActivityTitle(null, city, formData),
    activityType: style.toLowerCase().includes('museum') || style.toLowerCase().includes('culturel')
      ? 'museum'
      : 'tour',
    startDateTime: `${day}T${String(hour).padStart(2, '0')}:00:00Z`,
    endDateTime: `${day}T${String(Math.min(hour + DEFAULT_SLOT_HOURS, 20)).padStart(2, '0')}:00:00Z`,
    city,
    comments: `Activité complémentaire pour atteindre ${formData.minActivityHoursPerDay}–${formData.maxActivityHoursPerDay} h/jour. Inspiration : ${inspirationHint}.`,
    estimatedCost: Math.round((formData.budget || 0) * 0.25 / Math.max(1, formData.durationDays || 1) / 2),
    reservationStatus: 'to_reserve',
    bookingUrl: null
  }

  if (arrivalEndIso && parseDateOnly(arrivalEndIso) === day) {
    ensureActivityAfterArrival(filler, arrivalEndIso)
  }

  return filler
}

const validateItineraryActivityHours = (itinerary, formData = {}) => {
  const minHours = Math.max(0, Number(formData.minActivityHoursPerDay) || 0)
  const maxHours = Math.max(minHours, Number(formData.maxActivityHoursPerDay) || 8)
  const trip = itinerary?.trip || {}
  const start = parseDateOnly(trip.startDate)
  const end = parseDateOnly(trip.endDate)
  if (!start || !end || minHours <= 0) {
    return { valid: true, issues: [], dailyTotals: {} }
  }

  const dailyTotals = computeDailyLeisureHours(itinerary)
  const issues = []
  const lastActivityDay = addDays(end, -1)

  for (const [day, hours] of Object.entries(dailyTotals)) {
    if (lastActivityDay && day > lastActivityDay) continue
    if (hours === 0) {
      issues.push({
        code: 'DAILY_NO_ACTIVITIES',
        severity: 'warning',
        params: { date: day }
      })
    } else if (hours < minHours) {
      issues.push({
        code: 'DAILY_ACTIVITY_HOURS_BELOW_MIN',
        severity: 'warning',
        params: { date: day, hours: Math.round(hours * 10) / 10, minHours }
      })
    } else if (hours > maxHours + 1) {
      issues.push({
        code: 'DAILY_ACTIVITY_HOURS_ABOVE_MAX',
        severity: 'info',
        params: { date: day, hours: Math.round(hours * 10) / 10, maxHours }
      })
    }
  }

  return {
    valid: issues.every((i) => i.severity !== 'warning' && i.severity !== 'error'),
    issues,
    dailyTotals
  }
}

const ensureDailyActivityHours = (itinerary, formData = {}) => {
  const minHours = Math.max(0, Number(formData.minActivityHoursPerDay) || 0)
  const maxHours = Math.max(minHours, Number(formData.maxActivityHoursPerDay) || 8)
  if (minHours <= 0 || !itinerary?.stages?.length) {
    return { itinerary, filledDays: [], warnings: [] }
  }

  const enriched = {
    ...itinerary,
    stages: (itinerary.stages || []).map((s) => ({
      ...s,
      activities: [...(s.activities || [])]
    }))
  }

  const trip = enriched.trip || {}
  const start = parseDateOnly(trip.startDate)
  const end = parseDateOnly(trip.endDate)
  if (!start || !end) {
    return { itinerary: enriched, filledDays: [], warnings: [] }
  }

  const filledDays = []
  const warnings = []
  const lastActivityDay = addDays(end, -1)

  for (let day = start; day && day <= end; day = addDays(day, 1)) {
    if (lastActivityDay && day > lastActivityDay) break

    let totals = computeDailyLeisureHours(enriched)
    let currentHours = totals[day] || 0
    if (currentHours >= minHours) continue

    const stage = findStageForDate(enriched.stages, day)
    if (!stage) continue

    const stageRef = enriched.stages.find((s) => s === stage || s.name === stage.name)
    if (!stageRef) continue

    const needed = slotsNeededForDay(currentHours, minHours, maxHours)
    const stageIndex = enriched.stages.indexOf(stageRef)
    const arrivalEnd = getStageArrivalEnd(stageRef, stageIndex, enriched)

    for (let slot = 0; slot < needed; slot += 1) {
      totals = computeDailyLeisureHours(enriched)
      currentHours = totals[day] || 0
      if (currentHours >= minHours) break
      if (currentHours + DEFAULT_SLOT_HOURS > maxHours + 0.5 && slot > 0) break

      stageRef.activities.push(buildFillerActivity({
        day,
        slotIndex: slot,
        stage: stageRef,
        formData,
        arrivalEndIso: parseDateOnly(arrivalEnd) === day ? arrivalEnd : null
      }))
    }

    totals = computeDailyLeisureHours(enriched)
    currentHours = totals[day] || 0
    if (currentHours > 0 && currentHours < minHours) {
      warnings.push(`Jour ${day} : ${Math.round(currentHours * 10) / 10} h d'activités (minimum ${minHours} h demandé).`)
    } else if (currentHours >= minHours) {
      filledDays.push(day)
    }
  }

  return { itinerary: enriched, filledDays, warnings }
}

const finalizeItineraryActivityTiming = (itinerary) => {
  const { enforceActivitiesAfterTransport } = require('./itinerary-scheduler')
  return enforceActivitiesAfterTransport(itinerary)
}

module.exports = {
  isLeisureActivity,
  activityDurationHours,
  computeDailyLeisureHours,
  validateItineraryActivityHours,
  ensureDailyActivityHours,
  finalizeItineraryActivityTiming,
  LEISURE_ACTIVITY_TYPES
}
