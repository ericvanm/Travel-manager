const { flattenActivities } = require('./trip-flatten')
const { getActivityTypeId } = require('./activity-types')
const { resolveStageIdForActivityChange } = require('./ai-adapt-service')
const { parseDateOnly, addDays, listDateRange, deriveTripDateBounds, compareDateOnly } = require('./date-only')
const { extractStageCity } = require('./trip-location-validation')

const HOTEL_TYPE_ID = 7

const isAccommodationActivity = (activity) =>
  activity?.activityTypeId === HOTEL_TYPE_ID
  || activity?.activityType === 'hotel'

const toAccommodationPeriod = (activity) => {
  let checkInDate = parseDateOnly(activity.checkInDate || activity.startDateTime)
  let checkOutDate = parseDateOnly(activity.checkOutDate || activity.endDateTime)

  if (checkInDate && !checkOutDate) {
    checkOutDate = addDays(checkInDate, 1)
  }
  if (checkInDate && checkOutDate && checkInDate === checkOutDate) {
    checkOutDate = addDays(checkInDate, 1)
  }

  return {
    checkInDate,
    checkOutDate,
    name: activity.name,
    id: activity.id,
    activity
  }
}

const accommodationCoversNight = (day, accommodation) => {
  const checkIn = parseDateOnly(accommodation.checkInDate)
  const checkOut = parseDateOnly(accommodation.checkOutDate)
  if (!checkIn || !checkOut) return false
  return checkIn <= day && day < checkOut
}

const listNightsToCover = (trip, stages, activities = []) => {
  const { start, end } = deriveTripDateBounds(trip, stages, activities)
  if (!start || !end || compareDateOnly(start, end) >= 0) return []
  // Last calendar day is typically return travel — no overnight stay required.
  const lastNight = addDays(end, -1)
  if (!lastNight || compareDateOnly(lastNight, start) < 0) return []
  return listDateRange(start, lastNight)
}

const findUncoveredNights = (trip, stages, accommodations, activities = []) => {
  const days = listNightsToCover(trip, stages, activities)
  if (days.length === 0) return []

  return days.filter((day) =>
    !accommodations.some((acc) => accommodationCoversNight(day, acc))
  )
}

const findStageForDay = (stages, day) => {
  for (const stage of stages) {
    const start = parseDateOnly(stage.startDate)
    const end = parseDateOnly(stage.endDate)
    if (start && end && start <= day && day <= end) return stage
  }
  return stages[0] || null
}

const mergeChangeIntoActivity = (activity, change) => {
  const data = change.data || {}
  Object.assign(activity, data)
  if (change.location) activity.city = change.location
  if (change.address) activity.address = change.address
  if (change.startDateTime) activity.startDateTime = change.startDateTime
  if (change.endDateTime) activity.endDateTime = change.endDateTime
  if (change.checkInDate) activity.checkInDate = change.checkInDate
  if (change.checkOutDate) activity.checkOutDate = change.checkOutDate
  if (change.estimatedCost != null) activity.cost = change.estimatedCost
  if (change.activityType) {
    activity.activityTypeId = getActivityTypeId(change.activityType)
    activity.activityType = change.activityType
  }
  if (change.description) activity.comments = change.description
  if (activity.activityTypeId === HOTEL_TYPE_ID || activity.activityType === 'hotel') {
    if (!activity.checkInDate && activity.startDateTime) {
      activity.checkInDate = parseDateOnly(activity.startDateTime)
    }
    if (!activity.checkOutDate && activity.endDateTime) {
      activity.checkOutDate = parseDateOnly(activity.endDateTime)
    }
  }
}

const validateTripAccommodationCoverage = (snapshot) => {
  const trip = snapshot?.trip || {}
  const stages = snapshot?.stages || []
  const activities = flattenActivities(snapshot || { stages: [] })

  const accommodationRecords = activities
    .filter(isAccommodationActivity)
    .map(toAccommodationPeriod)

  const accommodations = accommodationRecords.filter((acc) => acc.checkInDate && acc.checkOutDate)
  const invalidAccommodations = accommodationRecords.filter((acc) => !acc.checkInDate || !acc.checkOutDate)

  const uncoveredNights = findUncoveredNights(trip, stages, accommodations, activities)
  const nights = listNightsToCover(trip, stages, activities)

  return {
    covered: nights.length === 0 ? true : uncoveredNights.length === 0,
    uncoveredNights,
    totalDays: nights.length,
    accommodationCount: accommodations.length,
    invalidAccommodationCount: invalidAccommodations.length,
    invalidAccommodations: invalidAccommodations.map((a) => ({
      id: a.id,
      name: a.name
    }))
  }
}

const simulateSnapshotAfterChanges = (snapshot, proposedChanges) => {
  const cloned = JSON.parse(JSON.stringify(snapshot))

  for (const change of proposedChanges?.changes || []) {
    const data = change.data || {}

    if (change.entityType === 'trip' && change.action === 'update') {
      Object.assign(cloned.trip, data)
    }

    if (change.entityType === 'stage') {
      if (change.action === 'update' && change.entityId) {
        const stage = cloned.stages.find((s) => s.id === change.entityId)
        if (stage) Object.assign(stage, data)
      }
      if (change.action === 'create') {
        cloned.stages.push({
          ...data,
          id: data.id || -(cloned.stages.length + 1),
          activities: []
        })
      }
      if (change.action === 'delete' && change.entityId) {
        cloned.stages = cloned.stages.filter((s) => s.id !== change.entityId)
      }
    }

    if (change.entityType === 'activity') {
      if (change.action === 'update' && change.entityId) {
        for (const stage of cloned.stages) {
          const activity = (stage.activities || []).find((a) => a.id === change.entityId)
          if (!activity) continue
          mergeChangeIntoActivity(activity, change)
        }
      }

      if (change.action === 'create') {
        const stageId = resolveStageIdForActivityChange(change, cloned.stages)
        const stage = cloned.stages.find((s) => s.id === stageId)
        if (stage) {
          const typeKey = change.activityType || data.activityType || 'tour'
          const activityTypeId = typeof typeKey === 'number' ? typeKey : getActivityTypeId(typeKey)
          const activity = {
            ...data,
            id: data.id || -(((stage.activities || []).length) + 1),
            stageId,
            activityTypeId,
            activityType: typeof typeKey === 'string' ? typeKey : undefined,
            name: data.name || change.description?.slice(0, 80) || 'Nouvelle activité',
            city: change.location || data.city || null,
            startDateTime: change.startDateTime || data.startDateTime || null,
            endDateTime: change.endDateTime || data.endDateTime || null,
            checkInDate: change.checkInDate || data.checkInDate || parseDateOnly(change.startDateTime) || null,
            checkOutDate: change.checkOutDate || data.checkOutDate || parseDateOnly(change.endDateTime) || null,
            cost: change.estimatedCost ?? data.cost ?? null,
            comments: change.description || data.comments || null
          }
          mergeChangeIntoActivity(activity, change)
          stage.activities = stage.activities || []
          stage.activities.push(activity)
        }
      }

      if (change.action === 'delete' && change.entityId) {
        for (const stage of cloned.stages) {
          stage.activities = (stage.activities || []).filter((a) => a.id !== change.entityId)
        }
      }
    }
  }

  return cloned
}

const validateAdaptationAccommodation = (snapshot, proposedChanges = null) => {
  const state = proposedChanges
    ? simulateSnapshotAfterChanges(snapshot, proposedChanges)
    : snapshot
  return validateTripAccommodationCoverage(state)
}

const fillAccommodationGaps = async (tripId, snapshot) => {
  const coverage = validateTripAccommodationCoverage(snapshot)
  if (coverage.covered || coverage.uncoveredNights.length === 0) {
    return { created: 0, nights: [] }
  }

  const { Activity } = require('../models/DBmodels')
  const { suggestBookingUrl } = require('./booking-urls')
const { buildAccommodationDateTimes } = require('./hotel-datetime')
  const createdNights = []

  for (const day of coverage.uncoveredNights) {
    const stage = findStageForDay(snapshot.stages || [], day)
    if (!stage?.id) continue

    const stageCity = extractStageCity(stage)
    const checkOut = addDays(day, 1)
    if (!checkOut) continue

    const { startDateTime, endDateTime } = buildAccommodationDateTimes({
      checkInDate: day,
      checkOutDate: checkOut,
      type: 'hotel'
    })

    await Activity.create({
      stageId: stage.id,
      activityTypeId: HOTEL_TYPE_ID,
      name: `Hébergement — ${stageCity}`,
      city: stageCity,
      checkInDate: day,
      checkOutDate: checkOut,
      startDateTime,
      endDateTime,
      reservationStatus: 'to_reserve',
      bookingUrl: suggestBookingUrl('accommodation', { activityType: 'hotel', name: stageCity, city: stageCity, checkInDate: day, checkOutDate: checkOut }),
      comments: `Nuit du ${day} — hébergement ajouté automatiquement pour couvrir le voyage.`
    })
    createdNights.push(day)
  }

  return { created: createdNights.length, nights: createdNights }
}

module.exports = {
  validateTripAccommodationCoverage,
  validateAdaptationAccommodation,
  simulateSnapshotAfterChanges,
  findUncoveredNights,
  listNightsToCover,
  deriveTripDateBounds,
  fillAccommodationGaps
}
