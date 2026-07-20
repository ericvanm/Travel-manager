const { test, describe } = require('node:test')
const assert = require('node:assert')
const {
  buildTransportLabel,
  normalizeTransportLeg,
  normalizeItineraryTransports
} = require('../utils/itinerary-transport')

describe('itinerary-transport', () => {
  test('buildTransportLabel formats route label', () => {
    assert.strictEqual(buildTransportLabel('train', 'Paris', 'Lyon'), 'Train : Paris → Lyon')
    assert.strictEqual(buildTransportLabel('flight', '', ''), 'Avion')
  })

  test('normalizeTransportLeg forces personal car when requested', () => {
    const leg = normalizeTransportLeg({
      mode: 'flight',
      label: 'Vol Paris → Lyon',
      description: 'Vol direct',
      estimatedCost: 200,
      departureLocation: 'Paris',
      arrivalLocation: 'Lyon'
    }, { localTransport: 'voiture personnelle' }, { forcePersonalCar: true })

    assert.strictEqual(leg.activityType, 'private_car')
    assert.strictEqual(leg.estimatedCost, 0)
    assert.ok(leg.label.includes('Voiture personnelle'))
  })

  test('normalizeItineraryTransports updates outbound and stage transports', () => {
    const itinerary = normalizeItineraryTransports({
      outboundTransport: {
        mode: 'flight',
        label: 'Wrong label',
        departureLocation: 'Brussels',
        arrivalLocation: 'Paris',
        estimatedCost: 150
      },
      returnTransport: {
        mode: 'train',
        departureLocation: 'Paris',
        arrivalLocation: 'Brussels',
        estimatedCost: 80
      },
      stages: [{
        name: 'Paris',
        arrivalTransport: {
          mode: 'flight',
          label: 'Vol',
          departureLocation: 'Brussels',
          arrivalLocation: 'Paris',
          estimatedCost: 150
        }
      }]
    }, { localTransport: 'voiture personnelle' })

    assert.strictEqual(itinerary.outboundTransport.activityType, 'private_car')
    assert.strictEqual(itinerary.outboundTransport.estimatedCost, 0)
    assert.strictEqual(itinerary.stages[0].arrivalTransport.activityType, 'private_car')
  })
})
