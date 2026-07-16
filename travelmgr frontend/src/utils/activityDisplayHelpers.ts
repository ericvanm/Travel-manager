import { Activity } from '../types'
import {
  ACTIVITY_TYPE,
  GROUND_TRANSPORT_TYPE_IDS,
  isTransportActivityType
} from './activityTypes'

export const isTransportActivity = (activity: Activity): boolean =>
  isTransportActivityType(activity.activityTypeId)
  || Boolean(activity.departureLocation || activity.departureAirport || activity.pickupLocation)

export const getAccommodationLocationLine = (activity: Activity): string | null => {
  if (activity.activityTypeId !== ACTIVITY_TYPE.HOTEL) return null
  const parts = [activity.city, activity.address].filter(Boolean)
  return parts.length > 0 ? parts.join(' — ') : null
}

const formatEndpointRoute = (from?: string | null, to?: string | null): string | null => {
  if (from && to) return `${from} → ${to}`
  return from || to || null
}

export const getTransportIdentificationLine = (activity: Activity): string | null => {
  const transportTypeId = resolveEffectiveTransportTypeId(activity)

  if (transportTypeId === ACTIVITY_TYPE.FLIGHT) {
    const parts = [
      activity.flightNumber,
      activity.airline,
      formatEndpointRoute(activity.departureAirport, activity.arrivalAirport),
      activity.confirmationCode || activity.confirmationNumber || activity.bookingCode,
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(' · ') : null
  }

  if (transportTypeId === ACTIVITY_TYPE.CAR_RENTAL) {
    const parts = [
      activity.company,
      activity.carType,
      formatEndpointRoute(activity.pickupLocation, activity.dropoffLocation),
      activity.confirmationNumber || activity.bookingCode,
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(' · ') : null
  }

  if (transportTypeId === ACTIVITY_TYPE.PRIVATE_CAR) {
    const route = formatEndpointRoute(activity.departureLocation, activity.arrivalLocation)
    return route ? `Voiture personnelle · ${route}` : 'Voiture personnelle'
  }

  if (transportTypeId != null && GROUND_TRANSPORT_TYPE_IDS.has(transportTypeId)) {
    const parts = [
      activity.company,
      activity.transportLine,
      formatEndpointRoute(activity.departureLocation, activity.arrivalLocation),
      activity.transportChanges != null && activity.transportChanges > 0
        ? `${activity.transportChanges} change(s)`
        : null,
      activity.confirmationNumber || activity.bookingCode,
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(' · ') : null
  }

  if (isTransportActivity(activity)) {
    const route = formatEndpointRoute(
      activity.departureLocation || activity.departureAirport,
      activity.arrivalLocation || activity.arrivalAirport
    )
    const ref = activity.confirmationNumber || activity.bookingCode
    if (route && ref) return `${route} · ${ref}`
    return route || ref || null
  }

  return null
}

export const getActivitySecondaryLine = (activity: Activity): string | null =>
  getAccommodationLocationLine(activity) || getTransportIdentificationLine(activity)

const resolveEffectiveTransportTypeId = (activity: Activity): number | undefined => {
  const typeId = activity.activityTypeId
  if (typeId == null) return undefined

  const label = `${activity.name || ''} ${activity.comments || ''}`.toLowerCase()
  if (/voiture personnelle|personal car|private car|voiture perso/.test(label)) {
    return ACTIVITY_TYPE.PRIVATE_CAR
  }

  if (typeId === ACTIVITY_TYPE.FLIGHT) {
    const hasFlightDetails = Boolean(
      activity.flightNumber || activity.airline || activity.departureAirport || activity.arrivalAirport
    )
    if (!hasFlightDetails && (activity.departureLocation || activity.arrivalLocation)) {
      return ACTIVITY_TYPE.PRIVATE_CAR
    }
  }

  return typeId
}

export const getTransportIconPrefix = (activity: Activity): string => {
  switch (resolveEffectiveTransportTypeId(activity)) {
    case ACTIVITY_TYPE.FLIGHT:
      return '✈'
    case ACTIVITY_TYPE.TRAIN:
      return '🚆'
    case ACTIVITY_TYPE.BUS:
      return '🚌'
    case ACTIVITY_TYPE.PUBLIC_TRANSPORT:
      return '🚇'
    case ACTIVITY_TYPE.CAR_RENTAL:
    case ACTIVITY_TYPE.PRIVATE_CAR:
      return '🚗'
    default:
      return ''
  }
}
