const { test, describe } = require('node:test')
const assert = require('node:assert')
const { sanitizeParams, sanitizeObject, sanitizeForLlm, sanitizeLlmMessages, redactConnectionUrl, buildDatabaseLogContext } = require('../utils/log-sanitizer')

describe('log-sanitizer', () => {
  test('redacts sensitive keys in objects', () => {
    const [result] = sanitizeParams([{ username: 'alice', password: 'secret123', token: 'abc' }])
    assert.strictEqual(result.username, 'alice')
    assert.strictEqual(result.password, '[REDACTED]')
    assert.strictEqual(result.token, '[REDACTED]')
  })

  test('truncates long strings', () => {
    const longValue = 'x'.repeat(150)
    const [result] = sanitizeParams([{ note: longValue }])
    assert.ok(result.note.endsWith('…'))
    assert.ok(result.note.length < longValue.length)
  })

  test('sanitizes nested objects and arrays', () => {
    const [result] = sanitizeParams([{
      items: [{ apiKey: 'hidden' }],
      meta: { authorization: 'Bearer xyz' }
    }])
    assert.strictEqual(result.items[0].apiKey, '[REDACTED]')
    assert.strictEqual(result.meta.authorization, '[REDACTED]')
  })

  test('redacts database connection URLs', () => {
    const url = 'postgres://postgres:secretpass@db.example.com:5432/travel_mgr'
    const redacted = redactConnectionUrl(url)
    assert.strictEqual(redacted, 'postgres://db.example.com:5432/travel_mgr')
    assert.ok(!redacted.includes('secretpass'))

    const [, sanitizedUrl] = sanitizeParams(['connecting to', url])
    assert.strictEqual(sanitizedUrl, redacted)
  })

  test('buildDatabaseLogContext exposes only non-sensitive fields', () => {
    const context = buildDatabaseLogContext(
      'postgres://postgres:secretpass@db.example.com:5432/travel_mgr',
      'production'
    )
    assert.deepStrictEqual(context, {
      environment: 'production',
      host: 'db.example.com',
      port: '5432',
      database: 'travel_mgr'
    })
    assert.ok(!JSON.stringify(context).includes('secretpass'))
    assert.ok(!JSON.stringify(context).includes('postgres:secretpass'))
  })

  test('sanitizeObject redacts sensitive keys', () => {
    const sanitized = sanitizeObject({ username: 'alice', token: 'abc' })
    assert.strictEqual(sanitized.username, 'alice')
    assert.strictEqual(sanitized.token, '[REDACTED]')
  })

  test('sanitizeForLlm redacts booking confirmation fields', () => {
    const sanitized = sanitizeForLlm({
      name: 'Flight to Paris',
      confirmationCode: 'ABC123',
      confirmationNumber: 'PNR-999',
      bookingCode: 'BK-42'
    })
    assert.strictEqual(sanitized.name, 'Flight to Paris')
    assert.strictEqual(sanitized.confirmationCode, '[REDACTED]')
    assert.strictEqual(sanitized.confirmationNumber, '[REDACTED]')
    assert.strictEqual(sanitized.bookingCode, '[REDACTED]')
  })

  test('sanitizeLlmMessages preserves role and content', () => {
    const messages = sanitizeLlmMessages([
      { role: 'system', content: 'You are a planner.' },
      { role: 'user', content: '{"confirmationCode":"secret"}' }
    ])
    assert.strictEqual(messages.length, 2)
    assert.strictEqual(messages[0].role, 'system')
    assert.strictEqual(messages[1].content, '{"confirmationCode":"secret"}')
  })

  test('sanitizeObject handles null input', () => {
    assert.strictEqual(sanitizeObject(null), null)
  })
})
