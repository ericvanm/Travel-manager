const { test, describe } = require('node:test')
const assert = require('node:assert')
const { sanitizeParams } = require('../utils/log-sanitizer')

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
})
