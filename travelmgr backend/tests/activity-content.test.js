const { test, describe } = require('node:test')
const assert = require('node:assert')
const {
  isGenericActivityName,
  buildActivitySearchQuery,
  normalizeItineraryActivities
} = require('../utils/activity-content')
const { normalizeItineraryTransports } = require('../utils/itinerary-transport')
const { suggestActivityBookingUrl } = require('../utils/booking-urls')

const juraFormData = {
  geographicZone: 'jura, france',
  travelStyle: 'culturel, randonnée, restaurant, visite village',
  localTransport: 'voiture personnelle',
  remarks: 'Je vais y aller en voiture personnelle.',
  departureLocation: 'Brussels',
  activityInspirationSites: 'GetYourGuide'
}

describe('activity-content', () => {
  test('detects generic numbered activity names', () => {
    assert.strictEqual(isGenericActivityName('Jour 1 — Visite 1 (jura)'), true)
    assert.strictEqual(isGenericActivityName('Visite des caves de Arbois'), false)
  })

  test('buildActivitySearchQuery excludes day numbers and region duplication', () => {
    const query = buildActivitySearchQuery({
      name: 'Jour 1 — Visite 1 (jura)',
      city: 'Arbois',
      activityType: 'tour'
    }, juraFormData)
    assert.ok(!query.toLowerCase().includes('jour 1'))
    assert.ok(!query.toLowerCase().includes('visite 1'))
    assert.ok(query.includes('Arbois'))
  })

  test('normalizeItineraryActivities renames generic activities', () => {
    const itinerary = normalizeItineraryActivities({
      stages: [{
        name: 'Arbois, France',
        activities: [{
          name: 'Jour 2 — Visite 2 (jura)',
          city: 'Arbois',
          activityType: 'tour'
        }]
      }]
    }, juraFormData)

    assert.ok(!isGenericActivityName(itinerary.stages[0].activities[0].name))
    assert.ok(itinerary.stages[0].activities[0].name.includes('Arbois'))
  })
})

describe('itinerary-transport personal car', () => {
  test('forces private car for all legs when user travels by personal car', () => {
    const itinerary = normalizeItineraryTransports({
      outboundTransport: {
        mode: 'flight',
        label: 'Avion : Brussels → jura, france',
        estimatedCost: 250,
        departureLocation: 'Brussels',
        arrivalLocation: 'jura, france'
      },
      returnTransport: {
        mode: 'flight',
        label: 'Avion : jura → Brussels',
        estimatedCost: 250,
        departureLocation: 'jura',
        arrivalLocation: 'Brussels'
      },
      stages: []
    }, juraFormData)

    assert.strictEqual(itinerary.outboundTransport.activityType, 'private_car')
    assert.strictEqual(itinerary.outboundTransport.estimatedCost, 0)
    assert.ok(itinerary.outboundTransport.label.startsWith('Voiture personnelle'))
    assert.ok(!/avion/i.test(itinerary.outboundTransport.label))
  })
})

describe('booking URL from cleaned activity names', () => {
  test('activity URL uses city and concrete title only', () => {
    const url = suggestActivityBookingUrl({
      name: 'Jour 1 — Visite 1 (jura)',
      city: 'Arbois',
      activityType: 'tour'
    }, juraFormData)

    const decoded = decodeURIComponent(url)
    assert.ok(!decoded.toLowerCase().includes('jour 1'))
    assert.ok(decoded.includes('Arbois'))
  })
})
