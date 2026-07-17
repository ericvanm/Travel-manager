const { test, describe } = require('node:test')
const assert = require('node:assert')
const {
  scheduleItinerary,
  enforceActivitiesAfterTransport
} = require('../utils/itinerary-scheduler')

const formData = {
  departureLocation: 'Bruxelles',
  geographicZone: 'Provence, France',
  durationDays: 5,
  budget: 2000,
  currency: 'EUR',
  localTransport: 'voiture'
}

describe('itinerary-scheduler', () => {
  test('scheduleItinerary adds arrival transport and booking urls', () => {
    const scheduled = scheduleItinerary({
      trip: { startDate: '2027-07-01', endDate: '2027-07-05' },
      outboundTransport: {
        mode: 'train',
        label: 'Train Bruxelles → Avignon',
        departureLocation: 'Bruxelles',
        arrivalLocation: 'Avignon',
        estimatedCost: 120
      },
      returnTransport: {
        mode: 'train',
        label: 'Retour Avignon → Bruxelles',
        departureLocation: 'Avignon',
        arrivalLocation: 'Bruxelles',
        estimatedCost: 120
      },
      stages: [{
        name: 'Avignon, France',
        startDate: '2027-07-01',
        endDate: '2027-07-05',
        activities: [{
          name: 'Palais des Papes',
          activityType: 'museum',
          startDateTime: '2027-07-01T08:00:00.000Z',
          endDateTime: '2027-07-01T10:00:00.000Z'
        }],
        accommodations: [{
          name: 'Hotel Avignon',
          type: 'hotel',
          city: 'Avignon',
          checkInDate: '2027-07-01',
          checkOutDate: '2027-07-05'
        }]
      }]
    }, formData)

    assert.ok(scheduled.stages[0].arrivalTransport)
    assert.ok(scheduled.stages[0].arrivalTransport.bookingUrl)
    assert.ok(scheduled.stages[0].activities[0].bookingUrl)
    assert.ok(scheduled.stages[0].accommodations[0].bookingUrl)
    assert.ok(new Date(scheduled.stages[0].activities[0].startDateTime) >= new Date(scheduled.stages[0].arrivalTransport.endDateTime))
  })

  test('enforceActivitiesAfterTransport shifts activities after stage arrival', () => {
    const activity = {
      activityType: 'tour',
      startDateTime: '2027-07-01T08:00:00.000Z',
      endDateTime: '2027-07-01T10:00:00.000Z'
    }
    const itinerary = enforceActivitiesAfterTransport({
      outboundTransport: { endDateTime: '2027-07-01T14:00:00.000Z' },
      stages: [{
        startDate: '2027-07-01',
        activities: [activity]
      }]
    })

    assert.ok(new Date(itinerary.stages[0].activities[0].startDateTime) >= new Date('2027-07-01T15:00:00.000Z'))
  })
})
