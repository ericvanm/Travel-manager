const { test, afterEach, describe } = require('node:test')
const assert = require('node:assert')
const { geocodePlace, geocodePlaces } = require('../utils/geocoding')

describe('geocoding', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  test('geocodePlace returns null for empty query', async () => {
    assert.strictEqual(await geocodePlace(''), null)
    assert.strictEqual(await geocodePlace('   '), null)
  })

  test('geocodePlace parses nominatim response', async () => {
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => [{
        lat: '48.8566',
        lon: '2.3522',
        display_name: 'Paris, France'
      }]
    })

    const point = await geocodePlace('Paris, France', 'fr')
    assert.ok(point)
    assert.strictEqual(point.lat, 48.8566)
    assert.strictEqual(point.lng, 2.3522)
    assert.ok(point.label.includes('Paris'))
  })

  test('geocodePlace returns null when API fails', async () => {
    globalThis.fetch = async () => ({ ok: false })
    assert.strictEqual(await geocodePlace('Nowhere'), null)
  })

  test('geocodePlaces deduplicates queries', async () => {
    let callCount = 0
    globalThis.fetch = async () => {
      callCount += 1
      return {
        ok: true,
        json: async () => [{ lat: '50.8503', lon: '4.3517', display_name: 'Brussels' }]
      }
    }

    const results = await geocodePlaces(['Brussels', 'Brussels', ''])
    assert.ok(results.Brussels)
    assert.strictEqual(callCount, 1)
  })
})
