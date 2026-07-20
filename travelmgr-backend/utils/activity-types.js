/** Shared activity type identifiers (keep in sync with activity_types table). */

const ACTIVITY_TYPE = {
  RESTAURANT: 1,
  MUSEUM: 2,
  TOUR: 3,
  SHOPPING: 4,
  ENTERTAINMENT: 5,
  FLIGHT: 6,
  HOTEL: 7,
  CAR_RENTAL: 8,
  TRAIN: 9,
  BUS: 10,
  PUBLIC_TRANSPORT: 11,
  PRIVATE_CAR: 12
}

const TRANSPORT_TYPE_IDS = new Set([
  ACTIVITY_TYPE.FLIGHT,
  ACTIVITY_TYPE.CAR_RENTAL,
  ACTIVITY_TYPE.TRAIN,
  ACTIVITY_TYPE.BUS,
  ACTIVITY_TYPE.PUBLIC_TRANSPORT,
  ACTIVITY_TYPE.PRIVATE_CAR
])

const ACTIVITY_TYPE_LABELS = {
  1: 'restaurant',
  2: 'museum',
  3: 'tour',
  4: 'shopping',
  5: 'entertainment',
  6: 'flight',
  7: 'hotel',
  8: 'car_rental',
  9: 'train',
  10: 'bus',
  11: 'public_transport',
  12: 'private_car'
}

const ACTIVITY_TYPE_MAP = {
  restaurant: 1,
  museum: 2,
  tour: 3,
  shopping: 4,
  entertainment: 5,
  flight: 6,
  hotel: 7,
  car_rental: 8,
  train: 9,
  bus: 10,
  public_transport: 11,
  private_car: 12,
  personal_car: 12,
  ferry: 11,
  metro: 11,
  tram: 11
}

const getActivityTypeId = (type) =>
  typeof type === 'number' ? type : (ACTIVITY_TYPE_MAP[type] || ACTIVITY_TYPE_MAP.tour)

const isTransportTypeId = (id) => TRANSPORT_TYPE_IDS.has(id)

module.exports = {
  ACTIVITY_TYPE,
  TRANSPORT_TYPE_IDS,
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPE_MAP,
  getActivityTypeId,
  isTransportTypeId
}
