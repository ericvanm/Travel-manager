const { test, describe } = require('node:test')
const assert = require('node:assert')
const {
  extractStageCity,
  buildGeoQuery,
  normalizeStageLocations,
  haversineKm
} = require('../utils/itinerary-location-validator')

describe('itinerary-location-validator', () => {
  test('extractStageCity parses stage name before dash or comma', () => {
    assert.strictEqual(extractStageCity({ name: 'Paris, France' }), 'Paris')
    assert.strictEqual(extractStageCity({ name: 'Lyon — étape 2' }), 'Lyon')
  })

  test('buildGeoQuery combines activity and zone context', () => {
    const query = buildGeoQuery({
      name: 'Musée',
      city: 'Paris',
      stageName: 'Paris, France',
      geographicZone: 'France'
    })
    assert.ok(query.includes('Paris'))
    assert.ok(query.includes('Musée'))
  })

  test('normalizeStageLocations assigns cities and address hints', () => {
    const itinerary = normalizeStageLocations({
      stages: [{
        name: 'Avignon, France',
        activities: [{ name: 'Palais des Papes', comments: 'Visit' }],
        accommodations: [{ name: 'Hotel Central' }]
      }]
    }, { geographicZone: 'Provence, France' })

    assert.strictEqual(itinerary.stages[0].activities[0].city, 'Avignon')
    assert.ok(itinerary.stages[0].accommodations[0].addressHint.includes('Avignon'))
  })

  test('haversineKm computes distance between coordinates', () => {
    const paris = { lat: 48.8566, lng: 2.3522 }
    const lyon = { lat: 45.764, lng: 4.8357 }
    const distance = haversineKm(paris, lyon)
    assert.ok(distance > 300)
    assert.ok(distance < 500)
  })
})
