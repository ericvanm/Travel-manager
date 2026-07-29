const { test, before, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const { connectToDatabase } = require('../utils/db')
const { User } = require('../models/DBmodels')
const {
  resetDatabase,
  createTripForUser,
  createAuthenticatedAgent,
  TEST_PASSWORD
} = require('./setup')

let app

before(async () => {
  await connectToDatabase()
  app = require('../app')
})

beforeEach(async () => {
  await resetDatabase()
})

describe('read-only user', () => {
  test('blocks mutating API calls but allows GET', async () => {
    const { agent, user } = await createAuthenticatedAgent(app, {
      username: 'writer',
      name: 'Writer'
    })
    await User.update({ readOnly: true }, { where: { id: user.id } })
    await agent.post('/api/auth/login').send({ username: 'writer', password: TEST_PASSWORD })

    const trip = await createTripForUser(user.id, { name: 'RO Trip' })
    const createBlocked = await agent.post('/api/trips').send({ name: 'New Trip' })
    assert.strictEqual(createBlocked.status, 403)
    assert.strictEqual(createBlocked.body.error, 'read_only_user')

    const list = await agent.get('/api/trips')
    assert.strictEqual(list.status, 200)

    const mutate = await agent.put(`/api/trips/${trip.id}`).send({ name: 'Renamed' })
    assert.strictEqual(mutate.status, 403)

    const logout = await agent.post('/api/auth/logout')
    assert.strictEqual(logout.status, 200)
  })
})

describe('GET /api/auth/public-config', () => {
  test('returns allowRegistration flag', async () => {
    const res = await require('supertest')(app).get('/api/auth/public-config')
    assert.strictEqual(res.status, 200)
    assert.strictEqual(typeof res.body.allowRegistration, 'boolean')
  })
})

describe('admin user management', () => {
  test('create, update password, toggle readOnly, delete', async () => {
    const { agent: adminAgent } = await createAuthenticatedAgent(app, { username: 'usermgr' })
    await User.update({ role: 'admin' }, { where: { username: 'usermgr' } })
    await adminAgent.post('/api/auth/login').send({ username: 'usermgr', password: TEST_PASSWORD })

    const created = await adminAgent.post('/api/admin/users').send({
      username: 'managed',
      password: 'ManagedUser1!',
      firstName: 'M',
      lastName: 'User',
      readOnly: false
    })
    assert.strictEqual(created.status, 201)
    assert.strictEqual(created.body.username, 'managed')

    const updated = await adminAgent.put(`/api/admin/users/${created.body.id}`).send({
      readOnly: true
    })
    assert.strictEqual(updated.status, 200)
    assert.strictEqual(updated.body.readOnly, true)

    const pwd = await adminAgent.put(`/api/admin/users/${created.body.id}/password`).send({
      newPassword: 'ManagedUser2!'
    })
    assert.strictEqual(pwd.status, 200)

    const deleted = await adminAgent.delete(`/api/admin/users/${created.body.id}`)
    assert.strictEqual(deleted.status, 204)
  })

  test('cannot delete admin role users', async () => {
    const { agent: adminAgent, user: adminUser } = await createAuthenticatedAgent(app, {
      username: 'protectadmin'
    })
    await User.update({ role: 'admin' }, { where: { id: adminUser.id } })
    await adminAgent.post('/api/auth/login').send({ username: 'protectadmin', password: TEST_PASSWORD })

    const { user: victim } = await createAuthenticatedAgent(app, { username: 'otheradmin' })
    await User.update({ role: 'admin' }, { where: { id: victim.id } })

    const blocked = await adminAgent.delete(`/api/admin/users/${victim.id}`)
    assert.strictEqual(blocked.status, 400)
    assert.strictEqual(blocked.body.error, 'cannot_delete_admin_user')
  })

  test('admin cannot set own account read-only or disabled', async () => {
    const { agent: adminAgent, user: adminUser } = await createAuthenticatedAgent(app, {
      username: 'selfadmin'
    })
    await User.update({ role: 'admin' }, { where: { id: adminUser.id } })
    await adminAgent.post('/api/auth/login').send({ username: 'selfadmin', password: TEST_PASSWORD })

    const readOnlyAttempt = await adminAgent.put(`/api/admin/users/${adminUser.id}`).send({
      readOnly: true
    })
    assert.strictEqual(readOnlyAttempt.status, 400)
    assert.strictEqual(readOnlyAttempt.body.error, 'cannot_self_read_only')

    const disableAttempt = await adminAgent.put(`/api/admin/users/${adminUser.id}`).send({
      disabled: true
    })
    assert.strictEqual(disableAttempt.status, 400)
    assert.strictEqual(disableAttempt.body.error, 'cannot_self_disable')
  })
})
