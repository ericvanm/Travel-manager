const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const {
  validateFormData,
  normalizeFormData,
  buildSynthesisText
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
})
