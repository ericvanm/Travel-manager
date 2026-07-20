/* eslint-disable no-undef */
require('dotenv').config()

const { buildDatabaseLogContext } = require('./log-sanitizer')

const PORT = process.env.PORT
const DB_URI = process.env.NODE_ENV === 'test'
  ? process.env.TEST_DATABASE_URL
  : process.env.DATABASE_URL
const ENVIR = process.env.NODE_ENV
const SECRET = process.env.SECRET

/** Cloud SQL Auth Proxy / Cloud Run connector uses a Unix socket; TLS is not applied on that path. */
const usesCloudSqlUnixSocket = typeof DB_URI === 'string' && DB_URI.includes('/cloudsql/')
const DB_SSL = ENVIR === 'production' && !usesCloudSqlUnixSocket

if (DB_URI && ENVIR === 'production') {
  const looksLikePostgresUrl = /^postgres(ql)?:\/\//i.test(DB_URI)
  // e.g. PROJECT:REGION:INSTANCE — Sequelize treats the project id as a "dialect"
  const looksLikeCloudSqlConnectionName = /^[a-z0-9-]+:[a-z0-9-]+:[a-z0-9-]+$/i.test(DB_URI.trim())
  if (!looksLikePostgresUrl) {
    const hint = looksLikeCloudSqlConnectionName
      ? 'GCP_DATABASE_URL must be a full Postgres URL, not only the Cloud SQL connection name. Example: postgres://USER:PASSWORD@/travel_mgr?host=/cloudsql/PROJECT:REGION:INSTANCE'
      : 'DATABASE_URL must start with postgres:// or postgresql://'
    throw new Error(hint)
  }
}

module.exports = {
  DB_URI: DB_URI,
  DB_LOG_CONTEXT: buildDatabaseLogContext(DB_URI, ENVIR),
  DB_SSL,
  PORT,
  ENVIR,
  SECRET
}