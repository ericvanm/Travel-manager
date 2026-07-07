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

  test('analyzeReservationText falls back when OpenAI is unavailable', async () => {
    const previousKey = process.env.OPENAI_API_KEY
    const previousUseOpenAi = process.env.USE_OPENAI
    process.env.OPENAI_API_KEY = 'invalid-key'
    process.env.USE_OPENAI = 'true'

    try {
      const result = await analyzeReservationText('Vol AF1234 Paris 15/03/2024 confirmation: ABC12345')
      assert.ok(result.detectedActivities.length > 0)
    } finally {
      process.env.OPENAI_API_KEY = previousKey
      process.env.USE_OPENAI = previousUseOpenAi
    }
  })
})
