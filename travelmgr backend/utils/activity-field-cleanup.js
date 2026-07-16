const { ACTIVITY_TYPE } = require('./activity-types')

const FLIGHT_FIELDS = [
  'airline', 'flightNumber', 'departureAirport', 'arrivalAirport',
  'confirmationCode', 'seat', 'gate', 'terminal'
]

const CAR_RENTAL_FIELDS = [
  'company', 'pickupLocation', 'dropoffLocation', 'carType'
]

const GROUND_TRANSPORT_FIELDS = [
  'company', 'departureLocation', 'arrivalLocation', 'transportLine', 'transportChanges'
]

const HOTEL_FIELDS = [
  'address', 'phone', 'checkInDate', 'checkOutDate', 'roomType'
]

const PRIVATE_CAR_FIELDS = [
  'departureLocation', 'arrivalLocation'
]

const TYPE_SPECIFIC_FIELDS = [
  ...FLIGHT_FIELDS,
  ...CAR_RENTAL_FIELDS,
  ...GROUND_TRANSPORT_FIELDS,
  ...HOTEL_FIELDS
]

const FIELDS_BY_TYPE = {
  [ACTIVITY_TYPE.FLIGHT]: [...FLIGHT_FIELDS, 'departureLocation', 'arrivalLocation'],
  [ACTIVITY_TYPE.CAR_RENTAL]: [...CAR_RENTAL_FIELDS],
  [ACTIVITY_TYPE.PRIVATE_CAR]: [...PRIVATE_CAR_FIELDS],
  [ACTIVITY_TYPE.TRAIN]: [...GROUND_TRANSPORT_FIELDS],
  [ACTIVITY_TYPE.BUS]: [...GROUND_TRANSPORT_FIELDS],
  [ACTIVITY_TYPE.PUBLIC_TRANSPORT]: [...GROUND_TRANSPORT_FIELDS],
  [ACTIVITY_TYPE.HOTEL]: [...HOTEL_FIELDS]
}

const clearIncompatibleActivityFields = (payload, activityTypeId) => {
  const allowed = new Set(FIELDS_BY_TYPE[activityTypeId] || [])
  const next = { ...payload }

  for (const field of TYPE_SPECIFIC_FIELDS) {
    if (!allowed.has(field)) {
      next[field] = null
    }
  }

  if (activityTypeId === ACTIVITY_TYPE.PRIVATE_CAR) {
    next.cost = 0
  }

  return next
}

const isPersonalCarTransport = (formData = {}) => {
  const hint = `${formData.localTransport || ''} ${formData.remarks || ''} ${formData.departureLocation || ''}`.toLowerCase()
  return /personnel|privée|privee|personal car|own car|ma voiture|voiture perso|y aller en voiture|en voiture personnelle/.test(hint)
}

const resolveCarActivityType = (formData = {}) =>
  (isPersonalCarTransport(formData) ? 'private_car' : 'car_rental')

const resolveTransportActivityType = (mode, formData = {}) => {
  const normalized = String(mode || '').toLowerCase()
  if (normalized === 'flight') return 'flight'
  if (normalized === 'car') return resolveCarActivityType(formData)
  if (normalized === 'train') return 'train'
  if (normalized === 'bus') return 'bus'
  if (normalized === 'public_transport' || normalized === 'metro') return 'public_transport'
  if (normalized === 'private_car') return 'private_car'
  if (normalized === 'car_rental') return 'car_rental'
  return 'tour'
}

module.exports = {
  clearIncompatibleActivityFields,
  isPersonalCarTransport,
  resolveCarActivityType,
  resolveTransportActivityType,
  FIELDS_BY_TYPE
}
