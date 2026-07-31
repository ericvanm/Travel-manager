require('dotenv').config()

const { buildDatabaseLogContext } = require('./log-sanitizer')
const { normalizeDatabaseUrl, assertDatabaseUrlParseable } = require('./database-url')

const PORT = Number(process.env.PORT) || 3001
const rawDbUri = process.env.NODE_ENV === 'test'
  ? process.env.TEST_DATABASE_URL
  : process.env.DATABASE_URL
const ENVIR = process.env.NODE_ENV
const SECRET = process.env.SECRET

const parseBooleanEnv = (value, defaultValue) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue
  }
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase())
}

const ALLOW_REGISTRATION = parseBooleanEnv(
  process.env.ALLOW_REGISTRATION,
  ENVIR !== 'production'
)

let DB_URI = rawDbUri
if (DB_URI && ENVIR === 'production') {
  const looksLikePostgresUrl = /^postgres(ql)?:\/\//i.test(DB_URI)
  const looksLikeCloudSqlConnectionName = /^[a-z0-9-]+:[a-z0-9-]+:[a-z0-9-]+$/i.test(DB_URI.trim())
  if (!looksLikePostgresUrl) {
    const hint = looksLikeCloudSqlConnectionName
      ? 'GCP_DATABASE_URL must be a full Postgres URL, not only the Cloud SQL connection name. Example: postgres://USER:PASSWORD@127.0.0.1/travel_mgr?host=/cloudsql/PROJECT:REGION:INSTANCE'
      : 'DATABASE_URL must start with postgres:// or postgresql://'
    throw new Error(hint)
  }
  DB_URI = assertDatabaseUrlParseable(DB_URI, 'DATABASE_URL')
} else if (DB_URI) {
  DB_URI = normalizeDatabaseUrl(DB_URI)
}

/** Cloud SQL Auth Proxy / Cloud Run connector uses a Unix socket; TLS is not applied on that path. */
const usesCloudSqlUnixSocket = typeof DB_URI === 'string' && DB_URI.includes('/cloudsql/')
const DB_SSL = ENVIR === 'production' && !usesCloudSqlUnixSocket

module.exports = {
  DB_URI: DB_URI,
  DB_LOG_CONTEXT: buildDatabaseLogContext(DB_URI, ENVIR),
  DB_SSL,
  PORT,
  ENVIR,
  SECRET,
  ALLOW_REGISTRATION
}