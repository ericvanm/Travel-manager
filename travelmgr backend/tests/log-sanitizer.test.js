const { test, describe } = require('node:test')
const assert = require('node:assert')
const { sanitizeParams, redactConnectionUrl, buildDatabaseLogContext } = require('../utils/log-sanitizer')

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
})
