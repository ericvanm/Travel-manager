const { test, before, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const { connectToDatabase } = require('../utils/db')
const { logAiInteraction } = require('../utils/ai-interaction-logger')
const { AiInteractionLog } = require('../models/DBmodels')
const { resetDatabase, createUser } = require('./setup')

before(async () => {
  await connectToDatabase()
})

beforeEach(async () => {
  await resetDatabase()
})

describe('ai-interaction-logger', () => {
  test('persists sanitized AI interaction logs', async () => {
    const user = await createUser({ username: 'loggeruser' })

    const log = await logAiInteraction({
      userId: user.id,
      feature: 'planning',
      operation: 'synthesis',
      model: 'gpt-test',
      systemPrompt: 'System',
      userPrompt: 'User prompt',
      requestMessages: [{
        role: 'user',
        content: '{"confirmationCode":"SECRET"}'
      }],
      requestPayload: {
        formData: { departureLocation: 'Paris' },
        confirmationNumber: 'PNR-123'
      },
      parsedResponse: { title: 'Trip', confirmationCode: 'ABC' },
      status: 'success'
    })

    assert.ok(log)
    const stored = await AiInteractionLog.findByPk(log.id)
    assert.strictEqual(stored.feature, 'planning')
    assert.ok(!JSON.stringify(stored.requestPayload).includes('PNR-123'))
    assert.ok(!JSON.stringify(stored.parsedResponse).includes('ABC'))
  })
})
