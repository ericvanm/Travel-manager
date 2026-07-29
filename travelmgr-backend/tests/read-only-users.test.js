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

const createAdminAgent = async (username) => {
  const { agent, user } = await createAuthenticatedAgent(app, { username, name: `${username} Admin` })
  await User.update({ role: 'admin' }, { where: { id: user.id } })
  await agent.post('/api/auth/login').send({ username, password: TEST_PASSWORD })
  return { agent, user }
}

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
    const { agent: adminAgent } = await createAdminAgent('usermgr')

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
    const { agent: adminAgent } = await createAdminAgent('protectadmin')

    const { user: victim } = await createAuthenticatedAgent(app, { username: 'otheradmin' })
    await User.update({ role: 'admin' }, { where: { id: victim.id } })

    const blocked = await adminAgent.delete(`/api/admin/users/${victim.id}`)
    assert.strictEqual(blocked.status, 400)
    assert.strictEqual(blocked.body.error, 'cannot_delete_admin_user')
  })

  test('admin cannot set own account read-only or disabled', async () => {
    const { agent: adminAgent, user: adminUser } = await createAdminAgent('selfadmin')

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

  test('lists users with management fields', async () => {
    const { agent: adminAgent } = await createAdminAgent('listadmin')
    const { user: regular } = await createAuthenticatedAgent(app, { username: 'listedregular' })

    const response = await adminAgent.get('/api/admin/users')
    assert.strictEqual(response.status, 200)
    const entry = response.body.find((row) => row.id === regular.id)
    assert.ok(entry)
    assert.strictEqual(typeof entry.readOnly, 'boolean')
    assert.strictEqual(typeof entry.disabled, 'boolean')
    assert.ok('allowPasswordReset' in entry)
  })

  test('rejects non-admin access to user management', async () => {
    const { agent } = await createAuthenticatedAgent(app, { username: 'notadmin' })
    const forbidden = await agent.post('/api/admin/users').send({
      username: 'hacker',
      password: 'HackerPass1!'
    })
    assert.strictEqual(forbidden.status, 403)
  })

  test('validates create user input', async () => {
    const { agent: adminAgent } = await createAdminAgent('createval')

    const shortPwd = await adminAgent.post('/api/admin/users').send({
      username: 'shortpwd',
      password: 'abc'
    })
    assert.strictEqual(shortPwd.status, 400)
    assert.strictEqual(shortPwd.body.error, 'password_too_short')

    const badRole = await adminAgent.post('/api/admin/users').send({
      username: 'badrole',
      password: 'ValidPass1!',
      role: 'superuser'
    })
    assert.strictEqual(badRole.status, 400)
    assert.strictEqual(badRole.body.error, 'invalid_role')

    await adminAgent.post('/api/admin/users').send({
      username: 'dupadmin',
      password: 'ValidPass1!'
    })
    const duplicate = await adminAgent.post('/api/admin/users').send({
      username: 'dupadmin',
      password: 'ValidPass1!'
    })
    assert.strictEqual(duplicate.status, 400)
    assert.strictEqual(duplicate.body.error, 'username_exists')
  })

  test('creates user with email read-only flag and admin role', async () => {
    const { agent: adminAgent } = await createAdminAgent('createfull')
    const created = await adminAgent.post('/api/admin/users').send({
      username: 'fulluser',
      password: 'FullUser1!',
      firstName: 'Full',
      lastName: 'User',
      email: 'Full.User@Example.com',
      readOnly: true,
      role: 'admin'
    })
    assert.strictEqual(created.status, 201)
    assert.strictEqual(created.body.email, 'full.user@example.com')
    assert.strictEqual(created.body.readOnly, true)
    assert.strictEqual(created.body.role, 'admin')
    assert.strictEqual(created.body.name, 'Full User')
  })

  test('validates update user and password routes', async () => {
    const { agent: adminAgent } = await createAdminAgent('updateval')
    const created = await adminAgent.post('/api/admin/users').send({
      username: 'updateme',
      password: 'UpdateMe1!'
    })
    const userId = created.body.id

    const badId = await adminAgent.put('/api/admin/users/not-id').send({ firstName: 'X' })
    assert.strictEqual(badId.status, 400)

    const missing = await adminAgent.put('/api/admin/users/999999').send({ firstName: 'X' })
    assert.strictEqual(missing.status, 404)

    const invalidRole = await adminAgent.put(`/api/admin/users/${userId}`).send({ role: 'guest' })
    assert.strictEqual(invalidRole.status, 400)
    assert.strictEqual(invalidRole.body.error, 'invalid_role')

    const profile = await adminAgent.put(`/api/admin/users/${userId}`).send({
      firstName: 'New',
      lastName: 'Name',
      email: 'new@example.com',
      disabled: true
    })
    assert.strictEqual(profile.status, 200)
    assert.strictEqual(profile.body.firstName, 'New')
    assert.strictEqual(profile.body.name, 'New Name')
    assert.strictEqual(profile.body.disabled, true)

    const shortNewPwd = await adminAgent.put(`/api/admin/users/${userId}/password`).send({
      newPassword: 'short'
    })
    assert.strictEqual(shortNewPwd.status, 400)

    const pwdMissingUser = await adminAgent.put('/api/admin/users/999999/password').send({
      newPassword: 'LongEnough1!'
    })
    assert.strictEqual(pwdMissingUser.status, 404)
  })

  test('last admin cannot demote themselves', async () => {
    const { agent: adminAgent, user: adminUser } = await createAdminAgent('soloadmin')
    const demote = await adminAgent.put(`/api/admin/users/${adminUser.id}`).send({ role: 'user' })
    assert.strictEqual(demote.status, 400)
    assert.strictEqual(demote.body.error, 'last_admin_cannot_demote')
  })

  test('two admins allow demoting the other', async () => {
    const { agent: adminA } = await createAdminAgent('admintwoa')
    const { user: adminB } = await createAdminAgent('admintwob')

    const demote = await adminA.put(`/api/admin/users/${adminB.id}`).send({ role: 'user' })
    assert.strictEqual(demote.status, 200)
    assert.strictEqual(demote.body.role, 'user')
  })

  test('keeps allowPasswordReset false when updating demo user', async () => {
    const bcrypt = require('bcryptjs')
    const { agent: adminAgent } = await createAdminAgent('demoadmin')
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10)
    const demo = await User.create({
      username: 'demo',
      passwordHash,
      name: 'demo user',
      firstName: 'user',
      lastName: 'demo',
      role: 'user',
      readOnly: true,
      allowPasswordReset: false,
      disabled: false,
      language: 'en'
    })

    const updated = await adminAgent.put(`/api/admin/users/${demo.id}`).send({
      firstName: 'visitor'
    })
    assert.strictEqual(updated.status, 200)
    const reloaded = await User.findByPk(demo.id)
    assert.strictEqual(reloaded.allowPasswordReset, false)
  })

  test('delete validations', async () => {
    const { agent: adminAgent, user: adminUser } = await createAdminAgent('deleteval')
    const created = await adminAgent.post('/api/admin/users').send({
      username: 'deleteme',
      password: 'DeleteMe1!'
    })

    const selfDelete = await adminAgent.delete(`/api/admin/users/${adminUser.id}`)
    assert.strictEqual(selfDelete.status, 400)
    assert.strictEqual(selfDelete.body.error, 'cannot_delete_self')

    const badId = await adminAgent.delete('/api/admin/users/abc')
    assert.strictEqual(badId.status, 400)

    const missing = await adminAgent.delete('/api/admin/users/999999')
    assert.strictEqual(missing.status, 404)

    const deleted = await adminAgent.delete(`/api/admin/users/${created.body.id}`)
    assert.strictEqual(deleted.status, 204)
  })
})

describe('auth read-only and registration flags', () => {
  test('registration defaults to normal user with password reset allowed', async () => {
    const supertest = require('supertest')
    const api = supertest(app)
    const response = await api.post('/api/auth/register').send({
      username: 'normalnew',
      password: TEST_PASSWORD,
      name: 'Normal New'
    })
    assert.strictEqual(response.status, 201)
    assert.strictEqual(response.body.readOnly, false)

    const stored = await User.findOne({ where: { username: 'normalnew' } })
    assert.strictEqual(stored.readOnly, false)
    assert.strictEqual(stored.allowPasswordReset, true)
  })

  test('verify returns readOnly after login', async () => {
    const { agent, user } = await createAuthenticatedAgent(app, { username: 'verifyro' })
    await User.update({ readOnly: true }, { where: { id: user.id } })
    await agent.post('/api/auth/login').send({ username: 'verifyro', password: TEST_PASSWORD })

    const verify = await agent.get('/api/auth/verify')
    assert.strictEqual(verify.status, 200)
    assert.strictEqual(verify.body.readOnly, true)
  })

  test('read-only user cannot update profile or password', async () => {
    const supertest = require('supertest')
    const agent = supertest.agent(app)
    await agent.post('/api/auth/register').send({
      username: 'roprofile',
      password: TEST_PASSWORD,
      name: 'RO Profile'
    })
    const user = await User.findOne({ where: { username: 'roprofile' } })
    await User.update({ readOnly: true }, { where: { id: user.id } })
    await agent.post('/api/auth/login').send({ username: 'roprofile', password: TEST_PASSWORD })

    const profile = await agent.put('/api/auth/profile').send({ firstName: 'Nope' })
    assert.strictEqual(profile.status, 403)
    assert.strictEqual(profile.body.error, 'read_only_user')

    const password = await agent.put('/api/auth/change-password').send({
      currentPassword: TEST_PASSWORD,
      newPassword: 'AnotherPass1!'
    })
    assert.strictEqual(password.status, 403)
    assert.strictEqual(password.body.error, 'read_only_user')
  })

  test('forgot-password does not issue token when reset disallowed', async () => {
    const supertest = require('supertest')
    const api = supertest(app)
    await api.post('/api/auth/register').send({
      username: 'noreset',
      password: TEST_PASSWORD,
      name: 'No Reset',
      email: 'noreset@example.com'
    })
    await User.update({ allowPasswordReset: false }, { where: { username: 'noreset' } })

    const response = await api.post('/api/auth/forgot-password').send({ email: 'noreset@example.com' })
    assert.strictEqual(response.status, 200)

    const user = await User.findOne({ where: { username: 'noreset' } })
    assert.strictEqual(user.passwordResetTokenHash, null)
  })
})
