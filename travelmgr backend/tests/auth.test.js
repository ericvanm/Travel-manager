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
