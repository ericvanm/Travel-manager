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

module.exports = {
  wallClockParts,
  wallClockDateInTimezone,
  wallClockTimeInTimezone,
}
