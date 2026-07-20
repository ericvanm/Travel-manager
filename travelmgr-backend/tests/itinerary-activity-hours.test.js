const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const {
  ensureDailyActivityHours,
  validateItineraryActivityHours,
  computeDailyLeisureHours
} = require('../utils/itinerary-activity-hours')
const {
  sanitizeBookingUrl,
  suggestActivityBookingUrl,
  parseHttpUrl
} = require('../utils/booking-urls')

describe('itinerary-activity-hours', () => {
  const formData = {
    durationDays: 3,
    budget: 900,
    travelStyle: 'culturel',
    minActivityHoursPerDay: 2,
    maxActivityHoursPerDay: 5,
    geographicZone: 'Lyon'
  }

  const sparseItinerary = {
    trip: { startDate: '2026-06-01', endDate: '2026-06-03' },
    stages: [{
      name: 'Lyon',
      startDate: '2026-06-01',
      endDate: '2026-06-02',
      activities: [{
        name: 'Musée',
        activityType: 'museum',
        startDateTime: '2026-06-01T10:00:00Z',
        endDateTime: '2026-06-01T11:00:00Z',
        city: 'Lyon'
      }]
    }]
  }

  it('detects days below minimum activity hours', () => {
    const validation = validateItineraryActivityHours(sparseItinerary, formData)
    assert.ok(validation.issues.some((i) => i.code === 'DAILY_ACTIVITY_HOURS_BELOW_MIN'))
    assert.ok(validation.issues.some((i) => i.code === 'DAILY_NO_ACTIVITIES'))
  })

  it('fills missing activity hours on empty days', () => {
    const { itinerary, filledDays } = ensureDailyActivityHours(sparseItinerary, formData)
    const totals = computeDailyLeisureHours(itinerary)
    assert.ok(totals['2026-06-02'] >= 2)
    assert.ok(filledDays.includes('2026-06-02'))
  })
})

describe('booking-urls', () => {
  it('sanitizes GetYourGuide deep links to search URLs', () => {
    const item = { name: 'Tokyo Tower', city: 'Tokyo', activityType: 'tour' }
    const sanitized = sanitizeBookingUrl(
      'https://www.getyourguide.com/tokyo-l123456/',
      item
    )
    assert.ok(sanitized.includes('getyourguide.com/s'))
    assert.ok(sanitized.includes('q='))
  })

  it('builds inspiration-site search URLs for activities', () => {
    const url = suggestActivityBookingUrl(
      { name: 'Food tour', city: 'Lyon', activityType: 'tour' },
      { activityInspirationSites: 'GetYourGuide' }
    )
    assert.ok(url.includes('getyourguide.com'))
    assert.ok(parseHttpUrl(url))
  })
})
