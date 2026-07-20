const { test } = require('node:test')
const assert = require('node:assert/strict')
const { normalizeDatabaseUrl, assertDatabaseUrlParseable } = require('../utils/database-url')

test('normalizeDatabaseUrl rewrites empty host for Cloud SQL socket URLs', () => {
  const input = 'postgres://user:secret@/travel_mgr?host=/cloudsql/proj:eu-west1:db'
  const out = normalizeDatabaseUrl(input)
  assert.equal(out, 'postgres://user:secret@127.0.0.1/travel_mgr?host=/cloudsql/proj:eu-west1:db')
})

test('assertDatabaseUrlParseable accepts normalized Cloud SQL URL', () => {
  const input = 'postgres://user:secret@/travel_mgr?host=/cloudsql/travel-manager-502910:europe-west1:travel-mgr-db'
  const out = assertDatabaseUrlParseable(input)
  assert.ok(out.includes('@127.0.0.1/travel_mgr'))
  assert.ok(out.includes('/cloudsql/travel-manager-502910'))
})
