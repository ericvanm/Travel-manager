const { describe, it, before, after } = require('node:test')
const assert = require('node:assert/strict')
const {
  validateFormData,
  normalizeFormData,
  buildSynthesisText,
  suggestOutboundTransportOptions,
  generateSynthesis,
  generateItinerary
} = require('../utils/ai-planning-service')

describe('ai-planning-service', () => {
  const validForm = {
    departureLocation: 'Bruxelles, Belgique',
    geographicZone: 'Provence, France',
    durationDays: 7,
    startDate: '2026-08-01',
    travelStyle: 'culturel et découverte',
    localTransport: 'voiture',
    accommodationType: 'hôtel',
    budget: 2500,
    currency: 'EUR'
  }

  before(() => {
    process.env.USE_OPENAI = 'false'
    delete process.env.OPENAI_API_KEY
  })

  after(() => {
    delete process.env.USE_OPENAI
  })

  it('normalizes form data', () => {
    const normalized = normalizeFormData({ ...validForm, budget: '2500' })
    assert.equal(normalized.budget, 2500)
    assert.equal(normalized.currency, 'EUR')
  })

  it('validates complete form data', () => {
    const result = validateFormData(validForm)
    assert.equal(result.isValid, true)
    assert.equal(result.errors.length, 0)
  })

  it('rejects missing geographic zone', () => {
    const result = validateFormData({ ...validForm, geographicZone: '' })
    assert.equal(result.isValid, false)
    assert.ok(result.errors.some((e) => e.includes('zone géographique')))
  })

  it('rejects invalid duration', () => {
    const result = validateFormData({ ...validForm, durationDays: 0 })
    assert.equal(result.isValid, false)
  })

  it('warns on tight daily budget', () => {
    const result = validateFormData({ ...validForm, budget: 200, durationDays: 7 })
    assert.equal(result.isValid, true)
    assert.ok(result.warnings.length > 0)
  })

  it('builds synthesis text from form data', () => {
    const validation = validateFormData(validForm)
    const synthesis = buildSynthesisText(validation.formData, validation.warnings)
    assert.ok(synthesis.summary.includes('Provence'))
    assert.equal(synthesis.estimatedDailyBudget, Math.round(2500 / 7))
  })

  it('suggestOutboundTransportOptions prefers train in same region', () => {
    const transport = suggestOutboundTransportOptions({
      ...validForm,
      departureLocation: 'Paris, France',
      geographicZone: 'Lyon, France'
    })
    assert.ok(transport.options.length >= 2)
    assert.equal(transport.recommended.mode, 'train')
  })

  it('suggestOutboundTransportOptions uses personal car when selected', () => {
    const transport = suggestOutboundTransportOptions({
      ...validForm,
      localTransport: 'voiture personnelle'
    })
    assert.equal(transport.recommended.mode, 'car')
    assert.equal(transport.recommended.estimatedCost, 0)
  })

  it('generateSynthesis falls back without OpenAI', async () => {
    const result = await generateSynthesis(validForm, 'fr')
    assert.equal(result.source, 'fallback')
    assert.ok(result.summary.includes('Provence'))
  })

  it('generateItinerary builds fallback itinerary pipeline', async () => {
    const itinerary = await generateItinerary(validForm, null, null, 'fr')
    assert.equal(itinerary.source, 'fallback')
    assert.ok(Array.isArray(itinerary.stages))
    assert.ok(itinerary.stages.length > 0)
    assert.ok(itinerary.outboundTransport)
    assert.ok(itinerary.stages[0].accommodations.length > 0)
  })

  it('validateFormData collects multiple warnings and errors', () => {
    const result = validateFormData({
      departureLocation: 'Paris',
      geographicZone: 'Paris',
      durationDays: 25,
      travelStyle: 'repos en ville',
      localTransport: 'voiture en ville',
      accommodationType: 'camping',
      budget: 50,
      currency: 'EU',
      maxActivityHoursPerDay: 18,
      startDate: 'invalid-date'
    })

    assert.equal(result.isValid, false)
    assert.ok(result.errors.some((e) => e.includes('devise')))
    assert.ok(result.errors.some((e) => e.includes('date')))
    assert.ok(result.warnings.some((w) => w.includes('identiques')))
    assert.ok(result.warnings.some((w) => w.includes('16 h')))
    assert.ok(result.warnings.some((w) => w.includes('repos') || w.includes('budget journalier')))
    assert.ok(result.warnings.some((w) => w.includes('camping')))
    assert.ok(result.warnings.some((w) => w.includes('ville')))
    assert.ok(result.warnings.some((w) => w.includes('serré')))
  })
})
