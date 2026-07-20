const { test, afterEach, describe } = require('node:test')
const assert = require('node:assert')
const { buildTripMapData } = require('../utils/trip-map-service')

describe('trip-map-service', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  test('buildTripMapData builds points and route segments', async () => {
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => [{
        lat: '50.8503',
        lon: '4.3517',
        display_name: 'Brussels'
      }]
    })

    const trip = { departureLocation: 'Brussels', currency: 'EUR' }
    const stages = [
      {
        id: 1,
        name: 'Paris',
        startDate: '2027-06-01',
        endDate: '2027-06-05',
        latitude: 48.8566,
        longitude: 2.3522
      },
      {
        id: 2,
        name: 'Lyon',
        startDate: '2027-06-06',
        endDate: '2027-06-10',
        latitude: 45.764,
        longitude: 4.8357
      }
    ]
    const activities = [
      {
        id: 1,
        stageId: 1,
        activityTypeId: 6,
        name: 'Vol aller',
        departureLocation: 'Brussels',
        departureAirport: 'BRU',
        startDateTime: '2027-06-01T08:00:00.000Z',
        cost: 180
      },
      {
        id: 2,
        stageId: 1,
        activityTypeId: 3,
        name: 'Musée',
        city: 'Paris',
        latitude: 48.8606,
        longitude: 2.3376,
        startDateTime: '2027-06-02T10:00:00.000Z'
      },
      {
        id: 3,
        stageId: 1,
        activityTypeId: 7,
        name: 'Hôtel Paris',
        city: 'Paris',
        latitude: 48.853,
        longitude: 2.349,
        startDateTime: '2027-06-01T15:00:00.000Z',
        reservationStatus: 'to_reserve'
      },
      {
        id: 4,
        stageId: 2,
        activityTypeId: 8,
        name: 'Train Paris → Lyon',
        departureLocation: 'Paris',
        startDateTime: '2027-06-06T07:00:00.000Z',
        cost: 45
      }
    ]

    const mapData = await buildTripMapData(trip, stages, activities, 'fr')

    assert.strictEqual(mapData.departureLocation, 'Brussels')
    assert.strictEqual(mapData.currency, 'EUR')
    assert.ok(mapData.mapPoints.length >= 3)
    assert.ok(mapData.routeSegments.length >= 2)
    assert.ok(mapData.mapPoints.some((point) => point.type === 'accommodation' || point.type === 'transport'))
    assert.ok(mapData.routeSegments.some((segment) => segment.isLocal === true || segment.transportMode))
  })
})
