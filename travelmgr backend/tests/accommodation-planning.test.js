const { test, describe } = require('node:test')
const assert = require('node:assert')
const {
  stripReturnDayAccommodations,
  normalizeAccommodationCheckoutDates
} = require('../utils/accommodation-planning')
const { ensureDailyAccommodation } = require('../utils/itinerary-location-validator')
const { buildAccommodationDateTimes } = require('../utils/hotel-datetime')

describe('accommodation planning', () => {
  test('stripReturnDayAccommodations removes lodging starting on trip end date', () => {
    const itinerary = {
      trip: { startDate: '2027-04-10', endDate: '2027-04-15' },
      stages: [{
        name: 'Tokyo',
        startDate: '2027-04-10',
        endDate: '2027-04-15',
        accommodations: [
          { name: 'Hotel A', checkInDate: '2027-04-10', checkOutDate: '2027-04-13' },
          { name: 'Bad last day', checkInDate: '2027-04-15', checkOutDate: '2027-04-16' }
        ]
      }]
    }

    stripReturnDayAccommodations(itinerary)
    assert.strictEqual(itinerary.stages[0].accommodations.length, 1)
    assert.strictEqual(itinerary.stages[0].accommodations[0].name, 'Hotel A')
  })

  test('ensureDailyAccommodation does not cover return day', () => {
    const itinerary = {
      trip: { startDate: '2027-04-10', endDate: '2027-04-12' },
      stages: [{
        name: 'Paris',
        startDate: '2027-04-10',
        endDate: '2027-04-12',
        accommodations: [{
          name: 'Hotel Paris',
          checkInDate: '2027-04-10',
          checkOutDate: '2027-04-12',
          type: 'hotel'
        }]
      }]
    }

    ensureDailyAccommodation(itinerary, { budget: 1000, accommodationType: 'hotel', currency: 'EUR' })

    const bad = itinerary.stages[0].accommodations.find(
      (acc) => acc.checkInDate === '2027-04-12'
    )
    assert.strictEqual(bad, undefined)
  })

  test('normalizeAccommodationCheckoutDates caps checkout on last stage', () => {
    const itinerary = {
      trip: { startDate: '2027-04-10', endDate: '2027-04-15' },
      stages: [{
        name: 'Kyoto',
        startDate: '2027-04-10',
        endDate: '2027-04-15',
        accommodations: [{
          name: 'Hotel Kyoto',
          checkInDate: '2027-04-10',
          checkOutDate: '2027-04-16'
        }]
      }]
    }

    normalizeAccommodationCheckoutDates(itinerary)
    assert.strictEqual(itinerary.stages[0].accommodations[0].checkOutDate, '2027-04-15')
  })

  test('buildAccommodationDateTimes uses local wall clock in stage timezone', () => {
    const hotelTimes = buildAccommodationDateTimes({
      checkInDate: '2027-04-10',
      checkOutDate: '2027-04-12',
      type: 'hotel',
      checkInTime: '15:00',
      checkOutTime: '11:00'
    }, 'Europe/Paris')
    assert.notStrictEqual(hotelTimes.startDateTime, '2027-04-10T15:00:00.000Z')
    assert.ok(hotelTimes.startDateTime.endsWith('Z'))
    assert.strictEqual(hotelTimes.checkInTime, '15:00')
  })
})
