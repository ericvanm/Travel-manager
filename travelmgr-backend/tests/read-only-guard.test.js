const { test, describe } = require('node:test')
const assert = require('node:assert')
const jwt = require('jsonwebtoken')
const { blockReadOnlyWrites } = require('../utils/read-only-guard')
const { SECRET } = require('../utils/config')

const runGuard = (req) => {
  let statusCode
  let body
  let nextCalled = false
  const res = {
    status(code) {
      statusCode = code
      return res
    },
    json(payload) {
      body = payload
      return res
    }
  }
  blockReadOnlyWrites(req, res, () => {
    nextCalled = true
  })
  return { statusCode, body, nextCalled }
}

describe('blockReadOnlyWrites', () => {
  test('allows safe HTTP methods', () => {
    const get = runGuard({ method: 'GET', originalUrl: '/api/trips', session: {} })
    assert.strictEqual(get.nextCalled, true)

    const options = runGuard({ method: 'OPTIONS', originalUrl: '/api/trips', session: {} })
    assert.strictEqual(options.nextCalled, true)
  })

  test('allows public auth write paths for read-only JWT', () => {
    const token = jwt.sign({ id: 1, username: 'demo', readOnly: true }, SECRET || process.env.SECRET)
    const logout = runGuard({
      method: 'POST',
      originalUrl: '/api/auth/logout',
      session: { token }
    })
    assert.strictEqual(logout.nextCalled, true)
    assert.strictEqual(logout.statusCode, undefined)
  })

  test('blocks mutating requests when JWT has readOnly', () => {
    const token = jwt.sign({ id: 1, username: 'demo', readOnly: true }, SECRET || process.env.SECRET)
    const blocked = runGuard({
      method: 'POST',
      originalUrl: '/api/trips',
      session: { token }
    })
    assert.strictEqual(blocked.nextCalled, false)
    assert.strictEqual(blocked.statusCode, 403)
    assert.strictEqual(blocked.body.error, 'read_only_user')
  })

  test('passes through when no session token', () => {
    const result = runGuard({ method: 'POST', originalUrl: '/api/trips', session: {} })
    assert.strictEqual(result.nextCalled, true)
  })

  test('passes through when token is invalid', () => {
    const result = runGuard({
      method: 'POST',
      originalUrl: '/api/trips',
      session: { token: 'not-a-valid-jwt' }
    })
    assert.strictEqual(result.nextCalled, true)
  })

  test('passes through when readOnly is false', () => {
    const token = jwt.sign({ id: 2, username: 'writer', readOnly: false }, SECRET || process.env.SECRET)
    const result = runGuard({
      method: 'PUT',
      originalUrl: '/api/trips/1',
      session: { token }
    })
    assert.strictEqual(result.nextCalled, true)
  })

  test('strips query string from path check', () => {
    const token = jwt.sign({ id: 1, username: 'demo', readOnly: true }, SECRET || process.env.SECRET)
    const allowed = runGuard({
      method: 'POST',
      originalUrl: '/api/auth/login?retry=1',
      session: { token }
    })
    assert.strictEqual(allowed.nextCalled, true)
  })
})
