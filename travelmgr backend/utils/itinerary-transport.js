const { isPersonalCarTransport, resolveTransportActivityType } = require('./activity-field-cleanup')

const TRANSPORT_LABELS = {
  private_car: 'Voiture personnelle',
  car_rental: 'Location de voiture',
  flight: 'Avion',
  train: 'Train',
  bus: 'Bus',
  public_transport: 'Transport public'
}

const buildTransportLabel = (activityType, from, to) => {
  const typeLabel = TRANSPORT_LABELS[activityType] || 'Transport'
  const route = [from, to].filter(Boolean).join(' → ')
  return route ? `${typeLabel} : ${route}` : typeLabel
}

const labelMatchesActivityType = (label, activityType) => {
  const text = String(label || '').toLowerCase()
  if (activityType === 'flight') return /avion|vol|flight/.test(text)
  if (activityType === 'private_car') return /voiture personnelle|personal car|private car/.test(text)
  if (activityType === 'car_rental') return /location/.test(text)
  if (activityType === 'train') return /train/.test(text)
  if (activityType === 'bus') return /bus/.test(text)
  return false
}

const normalizeTransportLeg = (transport, formData = null, { forcePersonalCar = false } = {}) => {
  if (!transport) return transport

  const next = { ...transport }
  const personalCar = forcePersonalCar || isPersonalCarTransport(formData)

  if (personalCar) {
    next.mode = 'car'
    next.activityType = 'private_car'
    next.estimatedCost = 0
    const from = next.departureLocation || formData?.departureLocation || ''
    const to = next.arrivalLocation || ''
    next.label = buildTransportLabel('private_car', from, to)
    if (!next.description || /avion|vol|flight/i.test(next.description)) {
      next.description = `Trajet en voiture personnelle ${from} → ${to}.`
    }
    return next
  }

  next.activityType = resolveTransportActivityType(next.mode || next.activityType, formData)

  if (next.activityType === 'private_car') {
    next.mode = 'car'
    next.estimatedCost = 0
  }

  if (!next.label || !labelMatchesActivityType(next.label, next.activityType)) {
    next.label = buildTransportLabel(
      next.activityType,
      next.departureLocation,
      next.arrivalLocation
    )
  }

  return next
}

const normalizeItineraryTransports = (itinerary, formData = null) => {
  const forcePersonalCar = isPersonalCarTransport(formData)
  const next = {
    ...itinerary,
    stages: (itinerary.stages || []).map((stage) => ({
      ...stage,
      arrivalTransport: stage.arrivalTransport
        ? normalizeTransportLeg(stage.arrivalTransport, formData, { forcePersonalCar })
        : stage.arrivalTransport
    }))
  }

  next.outboundTransport = normalizeTransportLeg(
    next.outboundTransport,
    formData,
    { forcePersonalCar }
  )
  next.returnTransport = normalizeTransportLeg(
    next.returnTransport,
    formData,
    { forcePersonalCar }
  )

  return next
}

module.exports = {
  TRANSPORT_LABELS,
  buildTransportLabel,
  normalizeTransportLeg,
  normalizeItineraryTransports
}
