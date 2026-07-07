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

const registerAndLogin = async (agent, username) => {
  await agent.post('/api/auth/register').send({ username, password: 'secret', name: `${username} Name` })
  await agent.post('/api/auth/login').send({ username, password: 'secret' })
}

describe('users profile API', () => {
  test('updates profile for authenticated user', async () => {
    const agent = supertest.agent(app)
    await registerAndLogin(agent, 'profileuser')

    const response = await agent.put('/api/auth/profile').send({
      firstName: 'Updated',
      lastName: 'User',
      language: 'fr'
    })

    assert.strictEqual(response.status, 200)
    assert.strictEqual(response.body.firstName, 'Updated')
    assert.strictEqual(response.body.language, 'fr')
  })

  test('changes password for authenticated user', async () => {
    const agent = supertest.agent(app)
    await registerAndLogin(agent, 'passuser')

    const response = await agent.put('/api/auth/change-password').send({
      currentPassword: 'secret',
      newPassword: 'newsecret'
    })

    assert.strictEqual(response.status, 200)

    const relogin = await agent.post('/api/auth/login').send({
      username: 'passuser',
      password: 'newsecret'
    })
    assert.strictEqual(relogin.status, 200)
  })

  test('lists public profiles', async () => {
    const agent = supertest.agent(app)
    await registerAndLogin(agent, 'listeduser')

    const response = await api.get('/api/auth/profiles')
    assert.strictEqual(response.status, 200)
    assert.ok(response.body.some((user) => user.username === 'listeduser'))
  })

  test('rejects password change with wrong current password', async () => {
    const agent = supertest.agent(app)
    await registerAndLogin(agent, 'wrongpassuser')

    const response = await agent.put('/api/auth/change-password').send({
      currentPassword: 'wrong',
      newPassword: 'newsecret'
    })

    assert.strictEqual(response.status, 400)
    assert.strictEqual(response.body.error, 'current_password_incorrect')
  })
})
