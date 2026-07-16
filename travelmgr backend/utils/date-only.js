/** UTC-safe YYYY-MM-DD parsing and iteration (avoids timezone infinite loops). */

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_TRIP_DAYS = 366 * 10

const parseDateOnly = (value) => {
  if (value == null || value === '') return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }
  const raw = String(value).slice(0, 10)
  return DATE_ONLY_RE.test(raw) ? raw : null
}

const addDays = (dateStr, days) => {
  const base = parseDateOnly(dateStr)
  if (!base) return null
  const [y, m, d] = base.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d + days))
  return date.toISOString().slice(0, 10)
}

const compareDateOnly = (a, b) => {
  const da = parseDateOnly(a)
  const db = parseDateOnly(b)
  if (!da || !db) return 0
  if (da < db) return -1
  if (da > db) return 1
  return 0
}

const listDateRange = (startStr, endStr, maxDays = MAX_TRIP_DAYS) => {
  const start = parseDateOnly(startStr)
  const end = parseDateOnly(endStr)
  if (!start || !end || compareDateOnly(start, end) > 0) return []

  const days = []
  let current = start
  for (let i = 0; i < maxDays && compareDateOnly(current, end) <= 0; i += 1) {
    days.push(current)
    const next = addDays(current, 1)
    if (!next || next === current) break
    current = next
  }
  return days
}

const collectActivityDateBounds = (activities = []) => {
  const dates = []
  for (const activity of activities) {
    const isHotel = activity?.activityTypeId === 7 || activity?.activityType === 'hotel'
    if (isHotel) {
      for (const key of ['checkInDate', 'checkOutDate', 'startDateTime', 'endDateTime']) {
        const parsed = parseDateOnly(activity?.[key])
        if (parsed) dates.push(parsed)
      }
    } else {
      for (const key of ['startDateTime', 'endDateTime']) {
        const parsed = parseDateOnly(activity?.[key])
        if (parsed) dates.push(parsed)
      }
    }
  }
  return dates
}

/** Merge trip dates with stage and activity dates so validation works when trip.startDate/endDate are empty. */
const deriveTripDateBounds = (trip, stages = [], activities = []) => {
  const starts = []
  const ends = []

  const tripStart = parseDateOnly(trip?.startDate)
  const tripEnd = parseDateOnly(trip?.endDate)
  if (tripStart) starts.push(tripStart)
  if (tripEnd) ends.push(tripEnd)

  for (const stage of stages) {
    const ss = parseDateOnly(stage?.startDate)
    const se = parseDateOnly(stage?.endDate)
    if (ss) starts.push(ss)
    if (se) ends.push(se)
  }

  for (const date of collectActivityDateBounds(activities)) {
    starts.push(date)
    ends.push(date)
  }

  if (starts.length === 0 || ends.length === 0) {
    return { start: null, end: null }
  }

  const compareIsoDate = (a, b) => String(a).localeCompare(String(b))
  starts.sort(compareIsoDate)
  ends.sort(compareIsoDate)
  return { start: starts[0], end: ends[ends.length - 1] }
}

const listTripDays = (trip, stages = [], activities = [], maxDays = MAX_TRIP_DAYS) => {
  const { start, end } = deriveTripDateBounds(trip, stages, activities)
  if (!start || !end) return []
  return listDateRange(start, end, maxDays)
}

module.exports = {
  parseDateOnly,
  addDays,
  compareDateOnly,
  listDateRange,
  deriveTripDateBounds,
  listTripDays,
  MAX_TRIP_DAYS
}
