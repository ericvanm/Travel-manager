const { test, describe } = require('node:test')
const assert = require('node:assert')
const {
  optionalAuth,
  requireAuth,
  requireAdmin,
  getUserId,
  getLanguageLabel,
  buildUserPayload,
  LANGUAGE_LABELS
} = require('../utils/auth-helpers')

const mockRes = () => {
  const res = { statusCode: 200, body: null }
  res.status = (code) => {
    res.statusCode = code
    return res
  }
  res.json = (payload) => {
    res.body = payload
    return res
  }
  return res
}

describe('auth-helpers', () => {
  test('buildUserPayload maps user fields', () => {
    const payload = buildUserPayload({
      id: 1,
      username: 'alice',
      name: 'Alice',
      language: 'fr',
      role: 'admin',
      mustSetPassword: true
    })
    assert.strictEqual(payload.username, 'alice')
    assert.strictEqual(payload.role, 'admin')
    assert.strictEqual(payload.mustSetPassword, true)
  })

  test('optionalAuth attaches session user', () => {
    const req = { session: { isLoggedIn: true, user: { id: 5, role: 'user' } } }
    const res = mockRes()
    let called = false
    optionalAuth(req, res, () => { called = true })
    assert.strictEqual(called, true)
    assert.strictEqual(getUserId(req), 5)
  })

  test('requireAuth rejects missing token', () => {
    const req = { session: {} }
    const res = mockRes()
    let called = false
    requireAuth(req, res, () => { called = true })
    assert.strictEqual(called, false)
    assert.strictEqual(res.statusCode, 401)
  })

  test('requireAdmin rejects non-admin users', () => {
    const req = { user: { id: 1, role: 'user' } }
    const res = mockRes()
    let called = false
    requireAdmin(req, res, () => { called = true })
    assert.strictEqual(called, false)
    assert.strictEqual(res.statusCode, 403)
  })

  test('getLanguageLabel falls back to French', () => {
    assert.strictEqual(getLanguageLabel('fr'), LANGUAGE_LABELS.fr)
    assert.strictEqual(getLanguageLabel('unknown'), LANGUAGE_LABELS.fr)
  })
})
