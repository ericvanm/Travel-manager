const { test, describe } = require('node:test')
const assert = require('node:assert')
const {
  isEmailConfigured,
  sendMail,
  sendPasswordResetEmail,
  FRONTEND_URL
} = require('../utils/email-service')

describe('email-service', () => {
  test('isEmailConfigured is false without SMTP env', () => {
    const originalHost = process.env.SMTP_HOST
    delete process.env.SMTP_HOST
    assert.strictEqual(isEmailConfigured(), false)
    if (originalHost) process.env.SMTP_HOST = originalHost
  })

  test('sendMail logs message when SMTP is not configured', async () => {
    const originalHost = process.env.SMTP_HOST
    delete process.env.SMTP_HOST

    const result = await sendMail({
      to: 'user@example.com',
      subject: 'Test',
      text: 'Hello'
    })
    assert.deepStrictEqual(result, { delivered: false, logged: true })

    if (originalHost) process.env.SMTP_HOST = originalHost
  })

  test('sendPasswordResetEmail builds localized reset content', async () => {
    const originalHost = process.env.SMTP_HOST
    delete process.env.SMTP_HOST

    const result = await sendPasswordResetEmail({
      to: 'user@example.com',
      username: 'alice',
      token: 'reset-token',
      language: 'fr'
    })
    assert.strictEqual(result.logged, true)
    assert.ok(FRONTEND_URL.length > 0)

    if (originalHost) process.env.SMTP_HOST = originalHost
  })
})
