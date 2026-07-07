const { test, describe } = require('node:test')
const assert = require('node:assert')
const { analyzeReservationText } = require('../utils/ai-service')

describe('ai-service', () => {
  test('analyzeReservationText detects flights, hotels and dates', async () => {
    const text = `
      Vol AF1234 Paris-New York 15/03/2024
      CDG to JFK
      hotel: Grand Hotel Plaza
      booking: CONF123456
      à Paris
    `

    const result = await analyzeReservationText(text)

    assert.ok(result.detectedActivities.length > 0)
    assert.ok(result.extractedInfo.dates.length > 0)
    assert.ok(result.extractedInfo.reservationNumbers.includes('CONF123456'))
  })

  test('analyzeReservationText uses fallback activity for plain text', async () => {
    const result = await analyzeReservationText('Generic travel document without structured markers')

    assert.strictEqual(result.detectedActivities.length, 1)
    assert.strictEqual(result.detectedActivities[0].type, 'activity')
    assert.ok(result.detectedActivities[0].confidence <= 0.3)
  })

  test('analyzeReservationText returns empty activities for short text', async () => {
    const result = await analyzeReservationText('short')
    assert.strictEqual(result.detectedActivities.length, 0)
  })
})
