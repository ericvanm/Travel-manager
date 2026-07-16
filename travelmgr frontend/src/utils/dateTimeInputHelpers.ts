export const splitDateTime = (dateTime?: string) => {
  if (!dateTime) {
    return { date: '', time: '' }
  }

  const separator = dateTime.includes('T') ? 'T' : ' '
  const [date, time = ''] = dateTime.split(separator)
  return { date, time: time.slice(0, 5) }
}

export const getDatePart = (dateTime?: string) => splitDateTime(dateTime).date

export const getTimePart = (dateTime?: string, defaultTime = '09:00') => {
  const { time } = splitDateTime(dateTime)
  return time || defaultTime
}

export const combineDateAndTime = (date: string, time: string) => (date ? `${date}T${(time || '00:00').slice(0, 5)}` : '')

const wallClockInTimezone = (ms: number, timeZone: string) => {
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
  const pick = (type: string) => parts.find((p) => p.type === type)?.value || ''
  return {
    date: `${pick('year')}-${pick('month')}-${pick('day')}`,
    time: `${pick('hour')}:${pick('minute')}`,
  }
}

/** Format UTC ISO datetime for datetime-local style input in a given IANA timezone. */
export const formatDateTimeForInputInTimezone = (
  iso: string | null | undefined,
  timeZone: string
): string => {
  if (!iso) return ''
  const wall = wallClockInTimezone(new Date(iso).getTime(), timeZone)
  return `${wall.date}T${wall.time}`
}

export const formatDateForInputInTimezone = (
  iso: string | null | undefined,
  timeZone: string
): string => {
  if (!iso) return ''
  return wallClockInTimezone(new Date(iso).getTime(), timeZone).date
}

export const formatTimeForInputInTimezone = (
  iso: string | null | undefined,
  timeZone: string,
  defaultTime = '09:00'
): string => {
  if (!iso) return defaultTime
  return wallClockInTimezone(new Date(iso).getTime(), timeZone).time || defaultTime
}

/** Convert wall-clock date+time in IANA timezone to UTC ISO string. */
export const combineDateAndTimeInTimezone = (
  date: string,
  time: string,
  timeZone: string
): string => {
  if (!date) return ''
  const targetDate = date
  const targetTime = (time || '00:00').slice(0, 5)

  let candidate = Date.parse(`${targetDate}T${targetTime}:00Z`)

  for (let i = 0; i < 6; i += 1) {
    const wall = wallClockInTimezone(candidate, timeZone || 'UTC')
    if (wall.date === targetDate && wall.time === targetTime) {
      return new Date(candidate).toISOString()
    }
    const targetMs = Date.parse(`${targetDate}T${targetTime}:00Z`)
    const actualMs = Date.parse(`${wall.date}T${wall.time}:00Z`)
    candidate += targetMs - actualMs
  }

  return new Date(candidate).toISOString()
}

export const localInputToUtcIso = (
  localDateTime: string | undefined,
  timeZone: string
): string | null => {
  if (!localDateTime) return null
  return combineDateAndTimeInTimezone(
    getDatePart(localDateTime),
    getTimePart(localDateTime),
    timeZone
  )
}
