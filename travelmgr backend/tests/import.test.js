const { test, before, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')
const supertest = require('supertest')
const { connectToDatabase } = require('../utils/db')
const { resetDatabase, createTrip } = require('./setup')

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
    const trip = await createTrip({ name: 'CSV Trip' })
    const csvPath = path.join(__dirname, '../../tests/Cape_Town__South_Africa__November_2025_export.csv')
    const csvContent = fs.readFileSync(csvPath, 'utf-8')

    const response = await api.post(`/api/trips/${trip.id}/import-csv`).send({ csvContent })
    assert.strictEqual(response.status, 200)
    assert.ok(response.body.importedStages >= 1)
    assert.ok(response.body.importedActivities >= 1)
  })

  test('rejects CSV import without content', async () => {
    const trip = await createTrip({ name: 'Empty CSV Trip' })
    const response = await api.post(`/api/trips/${trip.id}/import-csv`).send({})
    assert.strictEqual(response.status, 400)
  })
})
