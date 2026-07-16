/** Activity type IDs — keep in sync with backend activity_types table. */
export const ACTIVITY_TYPE = {
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
  PRIVATE_CAR: 12,
} as const

export const TRANSPORT_TYPE_IDS = new Set<number>([
  ACTIVITY_TYPE.FLIGHT,
  ACTIVITY_TYPE.CAR_RENTAL,
  ACTIVITY_TYPE.PRIVATE_CAR,
  ACTIVITY_TYPE.TRAIN,
  ACTIVITY_TYPE.BUS,
  ACTIVITY_TYPE.PUBLIC_TRANSPORT,
])

export const GROUND_TRANSPORT_TYPE_IDS = new Set<number>([
  ACTIVITY_TYPE.TRAIN,
  ACTIVITY_TYPE.BUS,
  ACTIVITY_TYPE.PUBLIC_TRANSPORT,
])

export const isTransportActivityType = (activityTypeId?: number): boolean =>
  activityTypeId != null && TRANSPORT_TYPE_IDS.has(activityTypeId)

export const isGroundTransportActivityType = (activityTypeId?: number): boolean =>
  activityTypeId != null && GROUND_TRANSPORT_TYPE_IDS.has(activityTypeId)

export const isPrivateCarActivityType = (activityTypeId?: number): boolean =>
  activityTypeId === ACTIVITY_TYPE.PRIVATE_CAR
