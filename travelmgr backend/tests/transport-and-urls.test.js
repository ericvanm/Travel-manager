const { test, describe } = require('node:test')
const assert = require('node:assert')
const {
  suggestAccommodationBookingUrl,
  suggestActivityBookingUrl,
  sanitizeBookingUrl
} = require('../utils/booking-urls')
const { clearIncompatibleActivityFields } = require('../utils/activity-field-cleanup')
const { ACTIVITY_TYPE } = require('../utils/activity-types')
const { ensureActivityAfterArrival } = require('../utils/itinerary-scheduler')

describe('booking-urls search format', () => {
  test('accommodation fallback uses q= not searchresults', () => {
    const url = suggestAccommodationBookingUrl({
      name: 'Hotel Test',
      city: 'Paris',
      checkInDate: '2027-06-01',
      checkOutDate: '2027-06-03'
    })
    assert.ok(url.includes('q='))
    assert.ok(!url.includes('searchresults'))
  })

  test('airbnb accommodation uses airbnb host', () => {
    const url = suggestAccommodationBookingUrl({
      name: 'Loft',
      city: 'Barcelona',
      type: 'airbnb',
      bookingSource: 'airbnb'
    })
    assert.ok(url.includes('airbnb.com'))
  })

  test('activity search uses getyourguide q=', () => {
    const url = suggestActivityBookingUrl(
      { name: 'Food tour', city: 'Lyon', activityType: 'tour' },
      { activityInspirationSites: 'GetYourGuide' }
    )
    assert.ok(url.includes('getyourguide.com/s'))
    assert.ok(url.includes('q='))
  })

  test('sanitizes viator searchResults to fallback search', () => {
    const item = { name: 'Tokyo tour', city: 'Tokyo', activityType: 'tour' }
    const sanitized = sanitizeBookingUrl(
      'https://www.viator.com/searchResults/all?text=Tokyo',
      item,
      null,
      'activity'
    )
    assert.ok(sanitized.includes('q=') || sanitized.includes('google.com/search'))
  })
})

describe('transport type cleanup', () => {
  test('flight to private_car clears flight fields', () => {
    const cleaned = clearIncompatibleActivityFields({
      name: 'Trajet voiture',
      airline: 'AF',
      flightNumber: '123',
      departureAirport: 'CDG',
      arrivalAirport: 'NRT',
      departureLocation: 'Paris',
      arrivalLocation: 'Lyon',
      cost: 0
    }, ACTIVITY_TYPE.PRIVATE_CAR)

    assert.strictEqual(cleaned.airline, null)
    assert.strictEqual(cleaned.flightNumber, null)
    assert.strictEqual(cleaned.departureAirport, null)
    assert.strictEqual(cleaned.departureLocation, 'Paris')
  })
})

describe('activity timing after transport', () => {
  test('shifts activity after flight arrival', () => {
    const activity = {
      startDateTime: '2027-06-01T12:00:00.000Z',
      endDateTime: '2027-06-01T14:00:00.000Z'
    }
    ensureActivityAfterArrival(activity, '2027-06-01T16:00:00.000Z')
    assert.ok(new Date(activity.startDateTime) >= new Date('2027-06-01T17:00:00.000Z'))
  })
})
