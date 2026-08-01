const { test, describe, afterEach } = require('node:test')
const assert = require('node:assert')
const path = require('node:path')

const CONFIG_PATH = path.join(__dirname, '../utils/config.js')

const loadConfig = () => {
  delete require.cache[require.resolve(CONFIG_PATH)]
  return require(CONFIG_PATH)
}

describe('utils/config', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    delete require.cache[require.resolve(CONFIG_PATH)]
  })

  test('rejects missing or short SECRET in production', () => {
    process.env.NODE_ENV = 'production'
    process.env.SECRET = 'tooshort'
    process.env.DATABASE_URL = 'postgres://u:p@localhost:5432/travel_mgr'
    assert.throws(() => loadConfig(), /SECRET must be set/)
  })

  test('accepts long SECRET in production', () => {
    process.env.NODE_ENV = 'production'
    process.env.SECRET = 'a-strong-secret-key'
    process.env.DATABASE_URL = 'postgres://u:p@localhost:5432/travel_mgr'
    const config = loadConfig()
    assert.strictEqual(config.SECRET, 'a-strong-secret-key')
    assert.strictEqual(config.ALLOW_REGISTRATION, false)
    assert.strictEqual(config.CORS_ALLOW_HOSTED_SUFFIXES, true)
  })

  test('CORS_ALLOW_HOSTED_SUFFIXES can be disabled', () => {
    process.env.NODE_ENV = 'test'
    process.env.SECRET = 'test-secret'
    process.env.CORS_ALLOW_HOSTED_SUFFIXES = 'false'
    const config = loadConfig()
    assert.strictEqual(config.CORS_ALLOW_HOSTED_SUFFIXES, false)
  })
})
