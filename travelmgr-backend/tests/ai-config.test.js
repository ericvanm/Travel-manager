const { test, describe } = require('node:test')
const assert = require('node:assert')
const { isOpenAIEnabled, requireAiEnabled } = require('../utils/ai-config')

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

describe('ai-config', () => {
  test('isOpenAIEnabled requires USE_OPENAI=true and a non-empty API key', () => {
    const savedKey = process.env.OPENAI_API_KEY
    const savedUse = process.env.USE_OPENAI

    process.env.USE_OPENAI = 'true'
    delete process.env.OPENAI_API_KEY
    assert.strictEqual(isOpenAIEnabled(), false)

    process.env.OPENAI_API_KEY = 'sk-test'
    assert.strictEqual(isOpenAIEnabled(), true)

    process.env.USE_OPENAI = 'false'
    assert.strictEqual(isOpenAIEnabled(), false)

    process.env.USE_OPENAI = 'True'
    assert.strictEqual(isOpenAIEnabled(), false)

    if (savedKey === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = savedKey
    if (savedUse === undefined) delete process.env.USE_OPENAI
    else process.env.USE_OPENAI = savedUse
  })

  test('requireAiEnabled skips guard in test environment', () => {
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'test'
    delete process.env.OPENAI_API_KEY
    process.env.USE_OPENAI = 'false'

    let nextCalled = false
    requireAiEnabled({}, mockRes(), () => {
      nextCalled = true
    })
    assert.ok(nextCalled)

    process.env.NODE_ENV = originalNodeEnv
  })

  test('requireAiEnabled returns 503 when OpenAI is disabled outside tests', () => {
    const originalNodeEnv = process.env.NODE_ENV
    const savedKey = process.env.OPENAI_API_KEY
    const savedUse = process.env.USE_OPENAI

    process.env.NODE_ENV = 'development'
    delete process.env.OPENAI_API_KEY
    process.env.USE_OPENAI = 'false'

    const res = mockRes()
    let nextCalled = false
    requireAiEnabled({}, res, () => {
      nextCalled = true
    })
    assert.strictEqual(res.statusCode, 503)
    assert.deepStrictEqual(res.body, { error: 'ai_disabled' })
    assert.strictEqual(nextCalled, false)

    process.env.OPENAI_API_KEY = 'sk-test'
    process.env.USE_OPENAI = 'true'
    const resOk = mockRes()
    requireAiEnabled({}, resOk, () => {
      nextCalled = true
    })
    assert.ok(nextCalled)

    process.env.NODE_ENV = originalNodeEnv
    if (savedKey === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = savedKey
    if (savedUse === undefined) delete process.env.USE_OPENAI
    else process.env.USE_OPENAI = savedUse
  })
})
