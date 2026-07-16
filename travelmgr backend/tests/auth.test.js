const { test, before, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const supertest = require('supertest')
const { connectToDatabase } = require('../utils/db')
const { resetDatabase } = require('./setup')

let app
let api

before(async () => {
  await connectToDatabase()
  app = require('../app')
  api = supertest(app)
})

beforeEach(async () => {
  await resetDatabase()
})

describe('GET /api/health', () => {
  test('returns ok', async () => {
    const response = await api.get('/api/health')
    assert.strictEqual(response.status, 200)
    assert.deepStrictEqual(response.body, { status: 'ok' })
  })
})

describe('POST /api/auth/register', () => {
  test('creates a user', async () => {
    const response = await api
      .post('/api/auth/register')
      .send({ username: 'newuser', password: 'secret', name: 'New User' })

    assert.strictEqual(response.status, 201)
    assert.strictEqual(response.body.username, 'newuser')
    assert.ok(response.body.id)
  })

  test('rejects duplicate username', async () => {
    await api.post('/api/auth/register').send({ username: 'dup', password: 'secret', name: 'User One' })

    const response = await api
      .post('/api/auth/register')
      .send({ username: 'dup', password: 'secret', name: 'User Two' })

    assert.strictEqual(response.status, 400)
    assert.strictEqual(response.body.error, 'Username already exists')
  })

  test('rejects short password', async () => {
    const response = await api
      .post('/api/auth/register')
      .send({ username: 'user', password: 'ab', name: 'User' })

    assert.strictEqual(response.status, 400)
    assert.match(response.body.error, /at least 3 characters/)
  })
})

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await api.post('/api/auth/register').send({ username: 'loginuser', password: 'secret', name: 'Login User' })
  })

  test('succeeds with valid credentials', async () => {
    const response = await api
      .post('/api/auth/login')
      .send({ username: 'loginuser', password: 'secret' })

    assert.strictEqual(response.status, 200)
    assert.strictEqual(response.body.username, 'loginuser')
  })

  test('rejects invalid password', async () => {
    const response = await api
      .post('/api/auth/login')
      .send({ username: 'loginuser', password: 'wrong' })

    assert.strictEqual(response.status, 401)
    assert.strictEqual(response.body.error, 'Invalid username or password')
  })
})

describe('GET /api/auth/verify', () => {
  test('rejects unauthenticated requests', async () => {
    const response = await api.get('/api/auth/verify')
    assert.strictEqual(response.status, 401)
  })

  test('returns user when session is valid', async () => {
    const agent = supertest.agent(app)

    await agent.post('/api/auth/register').send({ username: 'verifyuser', password: 'secret', name: 'Verify User' })
    await agent.post('/api/auth/login').send({ username: 'verifyuser', password: 'secret' })

    const response = await agent.get('/api/auth/verify')
    assert.strictEqual(response.status, 200)
    assert.strictEqual(response.body.username, 'verifyuser')
  })
})

describe('POST /api/auth/logout', () => {
  test('destroys session', async () => {
    const agent = supertest.agent(app)

    await agent.post('/api/auth/register').send({ username: 'logoutuser', password: 'secret', name: 'Logout User' })
    await agent.post('/api/auth/login').send({ username: 'logoutuser', password: 'secret' })

    const logoutResponse = await agent.post('/api/auth/logout')
    assert.strictEqual(logoutResponse.status, 200)

    const verifyResponse = await agent.get('/api/auth/verify')
    assert.strictEqual(verifyResponse.status, 401)
  })
})

describe('POST /api/auth/forgot-password', () => {
  test('returns success even for unknown email', async () => {
    const response = await api.post('/api/auth/forgot-password').send({ email: 'unknown@example.com' })
    assert.strictEqual(response.status, 200)
    assert.strictEqual(response.body.message, 'password_reset_requested')
  })

  test('stores reset token for registered user with email', async () => {
    await api.post('/api/auth/register').send({
      username: 'resetuser',
      password: 'secret',
      name: 'Reset User',
      email: 'resetuser@example.com'
    })

    const response = await api.post('/api/auth/forgot-password').send({ email: 'resetuser@example.com' })
    assert.strictEqual(response.status, 200)

    const { User } = require('../models/DBmodels')
    const user = await User.findOne({ where: { username: 'resetuser' } })
    assert.ok(user.passwordResetTokenHash)
    assert.ok(user.passwordResetExpiresAt)
  })
})

describe('POST /api/auth/reset-password', () => {
  test('resets password with valid token and logs in', async () => {
    const crypto = require('crypto')
    const { User } = require('../models/DBmodels')

    await api.post('/api/auth/register').send({
      username: 'tokenuser',
      password: 'oldsecret',
      name: 'Token User',
      email: 'tokenuser@example.com'
    })

    const token = crypto.randomBytes(32).toString('hex')
    const hash = crypto.createHash('sha256').update(token).digest('hex')
    const user = await User.findOne({ where: { username: 'tokenuser' } })
    await user.update({
      passwordResetTokenHash: hash,
      passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000)
    })

    const agent = supertest.agent(app)
    const response = await agent.post('/api/auth/reset-password').send({
      token,
      newPassword: 'newsecret8'
    })

    assert.strictEqual(response.status, 200)
    assert.strictEqual(response.body.username, 'tokenuser')

    const loginResponse = await agent.post('/api/auth/login').send({
      username: 'tokenuser',
      password: 'newsecret8'
    })
    assert.strictEqual(loginResponse.status, 200)
  })

  test('rejects invalid token', async () => {
    const response = await api.post('/api/auth/reset-password').send({
      token: 'invalid-token',
      newPassword: 'newsecret8'
    })
    assert.strictEqual(response.status, 400)
    assert.strictEqual(response.body.error, 'reset_token_invalid')
  })
})
