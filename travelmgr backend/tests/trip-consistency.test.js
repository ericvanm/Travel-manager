const { test, describe } = require('node:test')
const assert = require('node:assert')
const { validateTripConsistency } = require('../utils/trip-consistency')
const { validateTripAccommodationCoverage } = require('../utils/trip-accommodation-validation')
const { deriveTripDateBounds } = require('../utils/date-only')

describe('trip accommodation consistency', () => {
  test('detects uncovered nights when trip dates are empty but stages have dates', () => {
    const snapshot = {
      trip: { id: 1, startDate: null, endDate: null },
      stages: [{
        id: 1,
        name: 'Tokyo',
        startDate: '2026-03-01',
        endDate: '2026-03-03',
        activities: [{ id: 1, activityTypeId: 2, name: 'Museum', city: 'Tokyo' }]
      }]
    }

    const accommodation = validateTripAccommodationCoverage(snapshot)
    assert.strictEqual(accommodation.covered, false)
    assert.ok(accommodation.uncoveredNights.length > 0)

    const report = validateTripConsistency(snapshot)
    assert.strictEqual(report.health, 'error')
    assert.ok(report.issues.some((i) => i.code === 'ACCOMMODATION_NIGHT_UNCOVERED'))
  })

  test('derives date bounds from hotel activities when stage dates are missing', () => {
    const activities = [{
      id: 10,
      activityTypeId: 7,
      name: 'Hotel',
      checkInDate: '2026-04-10',
      checkOutDate: '2026-04-12'
    }]
    const bounds = deriveTripDateBounds({}, [{ id: 1, name: 'Paris' }], activities)
    assert.deepStrictEqual(bounds, { start: '2026-04-10', end: '2026-04-12' })
  })

  test('flags activity located outside its stage', () => {
    const snapshot = {
      trip: { id: 2, startDate: '2026-05-01', endDate: '2026-05-03' },
      stages: [{
        id: 1,
        name: 'Lyon',
        startDate: '2026-05-01',
        endDate: '2026-05-03',
        activities: [
          {
            id: 1,
            activityTypeId: 7,
            name: 'Hotel Lyon',
            city: 'Paris',
            checkInDate: '2026-05-01',
            checkOutDate: '2026-05-04'
          }
        ]
      }]
    }

    const report = validateTripConsistency(snapshot)
    assert.ok(report.issues.some((i) => i.code === 'ACCOMMODATION_LOCATION_MISMATCH'))
  })

  test('does not require accommodation on the last trip day (return day)', () => {
    const snapshot = {
      trip: { id: 3, startDate: '2027-04-10', endDate: '2027-04-15', departureLocation: 'Brussels' },
      stages: [{
        id: 1,
        name: 'Tokyo',
        startDate: '2027-04-10',
        endDate: '2027-04-15',
        activities: [{
          id: 1,
          activityTypeId: 7,
          name: 'Hotel Tokyo',
          city: 'Tokyo',
          checkInDate: '2027-04-10',
          checkOutDate: '2027-04-15'
        }]
      }]
    }

    const accommodation = validateTripAccommodationCoverage(snapshot)
    assert.strictEqual(accommodation.covered, true)
    assert.ok(!accommodation.uncoveredNights.includes('2027-04-15'))
  })

  test('allows return flight to home on final stage', () => {
    const snapshot = {
      trip: {
        id: 4,
        startDate: '2027-04-01',
        endDate: '2027-04-15',
        departureLocation: 'Brussels, Belgium'
      },
      stages: [
        {
          id: 1,
          name: 'Tokyo',
          startDate: '2027-04-01',
          endDate: '2027-04-14',
          activities: []
        },
        {
          id: 2,
          name: 'Retour à Tokyo',
          startDate: '2027-04-15',
          endDate: '2027-04-15',
          activities: [{
            id: 99,
            activityTypeId: 6,
            name: 'Vol Tokyo - Bruxelles',
            departureAirport: 'NRT',
            arrivalAirport: 'BRU',
            departureLocation: 'Tokyo',
            arrivalLocation: 'Brussels',
            startDateTime: '2027-04-15T10:00:00Z'
          }]
        }
      ]
    }

    const report = validateTripConsistency(snapshot)
    assert.ok(!report.issues.some((i) => i.code === 'TRANSPORT_ARRIVAL_LOCATION_MISMATCH'))
    assert.ok(!report.issues.some((i) => i.code === 'TRANSPORT_LOCATION_MISMATCH'))
  })

  test('recognizes train as transport with line and changes', () => {
    const { isTransportActivity } = require('../utils/trip-location-validation')
    const activity = {
      activityTypeId: 9,
      departureLocation: 'Paris Gare de Lyon',
      arrivalLocation: 'Lyon Part-Dieu',
      transportLine: 'TGV 6611',
      transportChanges: 0
    }
    assert.strictEqual(isTransportActivity(activity), true)
  })
})
