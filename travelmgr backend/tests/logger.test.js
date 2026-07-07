const { test, describe, mock, afterEach } = require('node:test')
const assert = require('node:assert')
const logger = require('../utils/logger')

describe('logger', () => {
  afterEach(() => {
    mock.restoreAll()
  })

  test('info logs static message', () => {
    const logMock = mock.method(console, 'log', () => {})
    logger.info('Starting App')
    assert.strictEqual(logMock.mock.calls.length, 1)
    assert.strictEqual(logMock.mock.calls[0].arguments[0], 'Starting App')
  })

  test('infoWithCounts logs only numeric values', () => {
    const logMock = mock.method(console, 'log', () => {})
    logger.infoWithCounts('Rows processed', 5, true, 'ignored')
    assert.strictEqual(logMock.mock.calls[0].arguments[1], '5')
    assert.strictEqual(logMock.mock.calls[0].arguments[2], 'true')
    assert.strictEqual(logMock.mock.calls[0].arguments.length, 3)
  })

  test('infoWithContext sanitizes object context', () => {
    const logMock = mock.method(console, 'log', () => {})
    logger.infoWithContext('connecting', { host: 'db.example.com', password: 'secret' })
    const serialized = logMock.mock.calls[0].arguments[1]
    assert.ok(serialized.includes('db.example.com'))
    assert.ok(serialized.includes('[REDACTED]'))
    assert.ok(!serialized.includes('secret'))
  })

  test('error logs message and error text', () => {
    const errorMock = mock.method(console, 'error', () => {})
    logger.error('Operation failed', new Error('boom'))
    assert.strictEqual(errorMock.mock.calls[0].arguments[0], 'Operation failed')
    assert.strictEqual(errorMock.mock.calls[0].arguments[1], 'boom')
  })

  test('error logs message only when err is not Error', () => {
    const errorMock = mock.method(console, 'error', () => {})
    logger.error('Operation failed', 'ignored')
    assert.strictEqual(errorMock.mock.calls[0].arguments.length, 1)
  })
})
