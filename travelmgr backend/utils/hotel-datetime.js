const { combineDateAndTimeInTimezone, resolveTimezoneForCountry } = require('./datetime-timezone')

const CHECK_IN_BY_TYPE = {
  hotel: '15:00',
  hôtel: '15:00',
  'bed and breakfast': '14:00',
  airbnb: '16:00',
  apartment: '16:00',
  appartement: '16:00',
  camping: '14:00',
  hostel: '14:00',
  'auberge': '14:00'
}

const CHECK_OUT_BY_TYPE = {
  hotel: '11:00',
  hôtel: '11:00',
  'bed and breakfast': '10:00',
  airbnb: '10:00',
  apartment: '10:00',
  appartement: '10:00',
  camping: '12:00',
  hostel: '10:00',
  'auberge': '10:00'
}

const DEFAULT_CHECK_IN = '15:00'
const DEFAULT_CHECK_OUT = '11:00'

const parseTime = (value) => {
  if (!value) return null
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})/)
  if (!match) return null
  return `${match[1].padStart(2, '0')}:${match[2]}`
}

const normalizeTypeKey = (type) => String(type || 'hotel').trim().toLowerCase()

const getDefaultCheckInTime = (accommodationType) =>
  CHECK_IN_BY_TYPE[normalizeTypeKey(accommodationType)] || DEFAULT_CHECK_IN

const getDefaultCheckOutTime = (accommodationType) =>
  CHECK_OUT_BY_TYPE[normalizeTypeKey(accommodationType)] || DEFAULT_CHECK_OUT

const getCheckInTime = (accommodation) =>
  parseTime(accommodation?.checkInTime) || getDefaultCheckInTime(accommodation?.type)

const getCheckOutTime = (accommodation) =>
  parseTime(accommodation?.checkOutTime) || getDefaultCheckOutTime(accommodation?.type)

const toDateOnly = (value) => {
  if (!value) return null
  const str = String(value)
  return str.length >= 10 ? str.slice(0, 10) : str
}

const resolveAccommodationTimezone = (accommodation, stage = null) => {
  if (accommodation?.timezone) return accommodation.timezone
  if (stage?.timezone) return stage.timezone
  return resolveTimezoneForCountry(stage?.countryCode || accommodation?.countryCode)
}

const buildAccommodationDateTimes = (accommodation, timeZone = 'Europe/Paris') => {
  const checkInDate = toDateOnly(accommodation?.checkInDate)
  const checkOutDate = toDateOnly(accommodation?.checkOutDate)
  if (!checkInDate || !checkOutDate) {
    return { startDateTime: null, endDateTime: null, checkInTime: null, checkOutTime: null }
  }
  const checkInTime = getCheckInTime(accommodation)
  const checkOutTime = getCheckOutTime(accommodation)
  const tz = timeZone || 'Europe/Paris'

  return {
    checkInTime,
    checkOutTime,
    startDateTime: combineDateAndTimeInTimezone(checkInDate, checkInTime, tz),
    endDateTime: combineDateAndTimeInTimezone(checkOutDate, checkOutTime, tz)
  }
}

module.exports = {
  getDefaultCheckInTime,
  getDefaultCheckOutTime,
  getCheckInTime,
  getCheckOutTime,
  resolveAccommodationTimezone,
  buildAccommodationDateTimes
}
