const { test, describe } = require('node:test')
const assert = require('node:assert')
const {
  buildSynthesisPrompt,
  buildItineraryPrompt,
  getSystemMessage,
  loadPromptsConfig
} = require('../utils/ai-planning-prompts')

const validForm = {
  departureLocation: 'Bruxelles, Belgique',
  geographicZone: 'Provence, France',
  durationDays: 7,
  startDate: '2027-08-01',
  travelStyle: 'culturel',
  localTransport: 'voiture',
  accommodationType: 'hôtel',
  budget: 2500,
  currency: 'EUR',
  remarks: 'Pas de gluten'
}

describe('ai-planning-prompts', () => {
  test('loadPromptsConfig returns normalized prompt sections', () => {
    const config = loadPromptsConfig()
    assert.ok(typeof config.systemMessage === 'string')
    assert.ok(Array.isArray(config.formFieldLines))
    assert.ok(config.synthesisInstructions.length > 0)
  })

  test('buildSynthesisPrompt includes sanitized form context', () => {
    const prompt = buildSynthesisPrompt(validForm, 'fr')
    assert.ok(prompt.includes('Provence'))
    assert.ok(prompt.includes('Bruxelles'))
    assert.ok(prompt.includes('Pas de gluten'))
  })

  test('buildItineraryPrompt includes revision block when feedback is provided', () => {
    const previousItinerary = {
      stages: [{ name: 'Paris', activities: [{ name: 'Tour', confirmationCode: 'SECRET' }] }]
    }
    const prompt = buildItineraryPrompt(
      validForm,
      previousItinerary,
      'Ajouter un musée',
      'fr'
    )
    assert.ok(prompt.includes('Ajouter un musée'))
    assert.ok(!prompt.includes('SECRET'))
  })

  test('getSystemMessage renders language label', () => {
    const message = getSystemMessage('en')
    assert.ok(message.length > 0)
    assert.ok(message.includes('English') || message.toLowerCase().includes('json'))
  })
})
