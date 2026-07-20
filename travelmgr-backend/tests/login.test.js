const { test, before, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const express = require('express')
const session = require('express-session')
const supertest = require('supertest')
const loginRouter = require('../controllers/login')
const { connectToDatabase } = require('../utils/db')
const { resetDatabase, createUser } = require('./setup')

let app
let api

before(async () => {
  await connectToDatabase()
  app = express()
  app.use(express.json())
  app.use(session({
    secret: process.env.SECRET || 'test-secret',
    resave: false,
    saveUninitialized: false
  }))
  app.use('/login', loginRouter)
  api = supertest(app)
})

beforeEach(async () => {
  await resetDatabase()
})

describe('login router', () => {
  test('authenticates valid user and sets session', async () => {
    await createUser({ username: 'alice', password: 'secret', name: 'Alice' })

    const agent = supertest.agent(app)
    const response = await agent
      .post('/login')
      .send({ username: 'alice', password: 'secret' })

    assert.strictEqual(response.status, 200)
    assert.strictEqual(response.body.username, 'alice')
  })

  test('rejects invalid credentials', async () => {
    await createUser({ username: 'alice', password: 'secret' })

    const response = await api
      .post('/login')
      .send({ username: 'alice', password: 'wrong' })

    assert.strictEqual(response.status, 401)
  })

  test('rejects disabled user', async () => {
    await createUser({ username: 'disabled', password: 'secret', disabled: true })

    const response = await api
      .post('/login')
      .send({ username: 'disabled', password: 'secret' })

    assert.strictEqual(response.status, 401)
    assert.match(response.body.error, /disabled/)
  })
})
