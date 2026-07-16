/** Wall-clock date/time in an IANA timezone (storage remains UTC ISO). */

const wallClockParts = (iso, timeZone = 'UTC') => {
  if (!iso) return null
  const ms = new Date(iso).getTime()
  if (Number.isNaN(ms)) return null

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timeZone || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })

  const parts = formatter.formatToParts(new Date(ms))
  const pick = (type) => parts.find((p) => p.type === type)?.value || ''

  return {
    date: `${pick('year')}-${pick('month')}-${pick('day')}`,
    time: `${pick('hour')}:${pick('minute')}`,
  }
}

const wallClockDateInTimezone = (iso, timeZone = 'UTC') =>
  wallClockParts(iso, timeZone)?.date || null

const wallClockTimeInTimezone = (iso, timeZone = 'UTC') =>
  wallClockParts(iso, timeZone)?.time || null

/** Convert wall-clock date+time in IANA timezone to UTC ISO string. */
const combineDateAndTimeInTimezone = (date, time, timeZone = 'UTC') => {
  if (!date) return null
  const targetDate = date
  const targetTime = (time || '00:00').slice(0, 5)

  let candidate = Date.parse(`${targetDate}T${targetTime}:00Z`)
  if (Number.isNaN(candidate)) return null

  for (let i = 0; i < 6; i += 1) {
    const wall = wallClockParts(new Date(candidate).toISOString(), timeZone || 'UTC')
    if (!wall) break
    if (wall.date === targetDate && wall.time === targetTime) {
      return new Date(candidate).toISOString()
    }
    const targetMs = Date.parse(`${targetDate}T${targetTime}:00Z`)
    const actualMs = Date.parse(`${wall.date}T${wall.time}:00Z`)
    candidate += targetMs - actualMs
  }

  return new Date(candidate).toISOString()
}

const TIMEZONE_BY_COUNTRY = {
  FR: 'Europe/Paris',
  ES: 'Europe/Madrid',
  IT: 'Europe/Rome',
  DE: 'Europe/Berlin',
  GB: 'Europe/London',
  UK: 'Europe/London',
  US: 'America/New_York',
  JP: 'Asia/Tokyo',
  NL: 'Europe/Amsterdam',
  BE: 'Europe/Brussels',
  CH: 'Europe/Zurich',
  PT: 'Europe/Lisbon'
}

const resolveTimezoneForCountry = (countryCode, fallback = 'Europe/Paris') => {
  const code = String(countryCode || '').trim().toUpperCase()
  return TIMEZONE_BY_COUNTRY[code] || fallback
}

module.exports = {
  wallClockParts,
  wallClockDateInTimezone,
  wallClockTimeInTimezone,
  combineDateAndTimeInTimezone,
  resolveTimezoneForCountry,
  TIMEZONE_BY_COUNTRY
}
