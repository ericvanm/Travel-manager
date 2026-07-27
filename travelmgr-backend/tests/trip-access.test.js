const { test, before, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const { connectToDatabase } = require('../utils/db')
const {
  userCanAccessTrip,
  parseTripId,
  ensureTripAccess,
  resolveTripIdFromStage,
  resolveTripIdFromActivity,
  requireTripAccessParam,
  requireStageAccessParam,
  requireActivityAccessParam
} = require('../utils/trip-access')
const {
  resetDatabase,
  createTrip,
  createTripForUser,
  createUser,
  createStage,
  createActivity
} = require('./setup')

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

before(async () => {
  await connectToDatabase()
})

beforeEach(async () => {
  await resetDatabase()
})

describe('trip-access', () => {
  test('parseTripId accepts positive integers only', () => {
    assert.strictEqual(parseTripId('12'), 12)
    assert.strictEqual(parseTripId(0), null)
    assert.strictEqual(parseTripId('abc'), null)
  })

  test('userCanAccessTrip returns false for invalid ids', async () => {
    assert.strictEqual(await userCanAccessTrip(null, 1), false)
    assert.strictEqual(await userCanAccessTrip(1, null), false)
  })

  test('userCanAccessTrip returns true for owned trips', async () => {
    const user = await createUser({ username: 'owneraccess' })
    const trip = await createTripForUser(user.id, { name: 'Owned Access Trip' })
    assert.strictEqual(await userCanAccessTrip(user.id, trip.id), true)
  })
})

describe('trip-access ensureTripAccess', () => {
  test('returns 401 when user is missing', async () => {
    const res = mockRes()
    const allowed = await ensureTripAccess({ method: 'GET' }, res, 1)
    assert.strictEqual(allowed, false)
    assert.strictEqual(res.statusCode, 401)
  })

  test('returns 400 for invalid trip id', async () => {
    const res = mockRes()
    const allowed = await ensureTripAccess(
      { method: 'GET', user: { id: 1, role: 'user' } },
      res,
      'abc'
    )
    assert.strictEqual(allowed, false)
    assert.strictEqual(res.statusCode, 400)
  })

  test('allows admin read-only access to an existing trip', async () => {
    const trip = await createTrip({ name: 'Admin Read Trip' })
    const res = mockRes()
    const allowed = await ensureTripAccess(
      { method: 'GET', user: { id: 99, role: 'admin' } },
      res,
      trip.id
    )
    assert.strictEqual(allowed, true)
  })

  test('allows admin HEAD access', async () => {
    const trip = await createTrip({ name: 'Admin Head Trip' })
    const res = mockRes()
    const allowed = await ensureTripAccess(
      { method: 'HEAD', user: { id: 99, role: 'admin' } },
      res,
      trip.id
    )
    assert.strictEqual(allowed, true)
  })

  test('blocks admin mutations on user trips', async () => {
    const trip = await createTrip({ name: 'Admin Mutate Trip' })
    const res = mockRes()
    const allowed = await ensureTripAccess(
      { method: 'PUT', user: { id: 99, role: 'admin' } },
      res,
      trip.id
    )
    assert.strictEqual(allowed, false)
    assert.strictEqual(res.statusCode, 403)
  })

  test('returns 404 for admin when trip does not exist', async () => {
    const res = mockRes()
    const allowed = await ensureTripAccess(
      { method: 'GET', user: { id: 99, role: 'admin' } },
      res,
      999999
    )
    assert.strictEqual(allowed, false)
    assert.strictEqual(res.statusCode, 404)
  })

  test('returns 404 when non-owner requests a trip', async () => {
    const owner = await createUser({ username: 'owner1' })
    const other = await createUser({ username: 'other1' })
    const trip = await createTripForUser(owner.id, { name: 'Owned' })
    const res = mockRes()
    const allowed = await ensureTripAccess(
      { method: 'GET', user: { id: other.id, role: 'user' } },
      res,
      trip.id
    )
    assert.strictEqual(allowed, false)
    assert.strictEqual(res.statusCode, 404)
  })

  test('allows trip owner read access', async () => {
    const user = await createUser({ username: 'ownerread' })
    const trip = await createTripForUser(user.id, { name: 'Owner Read' })
    const res = mockRes()
    const allowed = await ensureTripAccess(
      { method: 'GET', user: { id: user.id, role: 'user' } },
      res,
      trip.id
    )
    assert.strictEqual(allowed, true)
  })
})

describe('trip-access resolvers and middleware', () => {
  test('resolveTripIdFromStage and Activity return trip id', async () => {
    const user = await createUser({ username: 'resolver' })
    const trip = await createTripForUser(user.id)
    const stage = await createStage(trip.id)
    const activity = await createActivity(stage.id)

    assert.strictEqual(await resolveTripIdFromStage(stage.id), trip.id)
    assert.strictEqual(await resolveTripIdFromActivity(activity.id), trip.id)
    assert.strictEqual(await resolveTripIdFromActivity(999999), null)
  })

  test('requireTripAccessParam rejects invalid id', async () => {
    const middleware = requireTripAccessParam('id')
    const res = mockRes()
    await middleware(
      { params: { id: 'x' }, method: 'GET', user: { id: 1, role: 'user' } },
      res,
      () => assert.fail('next should not run')
    )
    assert.strictEqual(res.statusCode, 400)
  })

  test('requireStageAccessParam returns 404 for unknown stage', async () => {
    const middleware = requireStageAccessParam('id')
    const res = mockRes()
    await middleware(
      { params: { id: '999999' }, method: 'GET', user: { id: 1, role: 'user' } },
      res,
      () => assert.fail('next should not run')
    )
    assert.strictEqual(res.statusCode, 404)
  })

  test('requireActivityAccessParam calls next for owner and 404 for missing activity', async () => {
    const user = await createUser({ username: 'activityowner' })
    const trip = await createTripForUser(user.id)
    const stage = await createStage(trip.id)
    const activity = await createActivity(stage.id)

    const middleware = requireActivityAccessParam('id')
    let nextCalled = false
    const res = mockRes()
    await middleware(
      { params: { id: String(activity.id) }, method: 'GET', user: { id: user.id, role: 'user' } },
      res,
      () => { nextCalled = true }
    )
    assert.ok(nextCalled)

    const resMissing = mockRes()
    await middleware(
      { params: { id: '999999' }, method: 'GET', user: { id: user.id, role: 'user' } },
      resMissing,
      () => assert.fail('next should not run')
    )
    assert.strictEqual(resMissing.statusCode, 404)
  })
})
