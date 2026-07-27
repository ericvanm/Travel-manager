const { test, before, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')
const supertest = require('supertest')
const { connectToDatabase } = require('../utils/db')
const { resetDatabase, createTrip, createTripForUser, createAuthenticatedAgent } = require('./setup')

let app
let api

const SAMPLE_ICS = `BEGIN:VCALENDAR
X-WR-CALDESC:Imported trip
BEGIN:VEVENT
SUMMARY:Cape Town Vacation
DTSTART:20251107
DTEND:20251201
LOCATION:Cape Town
END:VEVENT
BEGIN:VEVENT
SUMMARY:Table Mountain hike
DTSTART:20251108T080000Z
DTEND:20251108T120000Z
LOCATION:Cape Town
END:VEVENT
END:VCALENDAR`

const SAMPLE_CSV = `"Trip Name","Trip Description","Trip Start Date","Trip End Date","Trip Budget","Trip Currency","Stage Name","Stage Country","Stage Start Date","Stage End Date","Stage Timezone","Activity Name","Activity Type","Activity Start DateTime","Activity End DateTime","Activity City","Activity Cost","Airline","Flight Number","Departure Airport","Arrival Airport","Seat","Gate","Terminal","Hotel Address","Hotel Phone","Check-in Date","Check-out Date","Room Type","Confirmation Number","Car Company","Pickup Location","Dropoff Location","Pickup Date","Dropoff Date","Car Type"
"Test Trip","Description","07/11/2025","08/11/2025","","","Paris","South Africa","07/11/2025","07/11/2025","UTC","Louvre visit","Restaurant","2025-11-07T10:00:00.000Z","2025-11-07T12:00:00.000Z","Paris","","","","","","","","","","","","","","","","","","","",""`

const loadSampleCsv = () => {
  const csvPath = path.join(__dirname, '../../tests/Cape_Town__South_Africa__November_2025_export.csv')
  if (fs.existsSync(csvPath)) {
    return fs.readFileSync(csvPath, 'utf-8')
  }
  return SAMPLE_CSV
}

before(async () => {
  await connectToDatabase()
  app = require('../app')
  api = supertest(app)
})

beforeEach(async () => {
  await resetDatabase()
})

describe('import API', () => {
  test('imports ICS content into a new trip', async () => {
    const response = await api.post('/api/import').send({
      icsContent: SAMPLE_ICS,
      tripName: 'Imported Trip'
    })

    assert.strictEqual(response.status, 200)
    assert.ok(response.body.tripId)
    assert.match(response.body.message, /successfully/i)
  })

  test('rejects missing ICS content', async () => {
    const response = await api.post('/api/import').send({ tripName: 'Missing content' })
    assert.strictEqual(response.status, 400)
  })

  test('rejects invalid ICS trip data', async () => {
    const response = await api.post('/api/import').send({
      icsContent: 'BEGIN:VCALENDAR\nEND:VCALENDAR',
      tripName: 'Invalid'
    })
    assert.strictEqual(response.status, 400)
  })

  test('updates an existing trip when tripId is provided', async () => {
    const trip = await createTrip({ name: 'Existing Trip' })
    const response = await api.post('/api/import').send({
      icsContent: SAMPLE_ICS,
      tripId: trip.id
    })
    assert.strictEqual(response.status, 200)
    assert.strictEqual(response.body.tripId, trip.id)
  })

  test('imports CSV into an existing trip', async () => {
    const { agent, user } = await createAuthenticatedAgent(app, { username: 'csvuser' })
    const trip = await createTripForUser(user.id, { name: 'CSV Trip' })
    const csvContent = loadSampleCsv()

    const response = await agent.post(`/api/trips/${trip.id}/import-csv`).send({ csvContent })
    assert.strictEqual(response.status, 200)
    assert.ok(response.body.importedStages >= 1)
    assert.ok(response.body.importedActivities >= 1)
  })

  test('rejects CSV import without content', async () => {
    const { agent, user } = await createAuthenticatedAgent(app, { username: 'emptycsv' })
    const trip = await createTripForUser(user.id, { name: 'Empty CSV Trip' })
    const response = await agent.post(`/api/trips/${trip.id}/import-csv`).send({})
    assert.strictEqual(response.status, 400)
  })
})
