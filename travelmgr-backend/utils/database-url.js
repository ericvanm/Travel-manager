/**
 * Normalizes Postgres URLs for Sequelize / pg-connection-string.
 * Cloud SQL on Cloud Run uses a Unix socket via ?host=/cloudsql/… — the common
 * form postgres://user:pass@/dbname?host=… can fail URL parsing when the host is empty.
 */
function normalizeDatabaseUrl(url) {
  if (typeof url !== 'string') {
    return url
  }

  const trimmed = url.trim()
  if (!/^postgres(ql)?:\/\//i.test(trimmed)) {
    return trimmed
  }

  // Empty host before path: @/database → @127.0.0.1/database (pg + Sequelize friendly)
  if (/@\//.test(trimmed)) {
    return trimmed.replace(/^(postgres(?:ql)?:\/\/[^@]+)@\//i, '$1@127.0.0.1/')
  }

  return trimmed
}

function assertDatabaseUrlParseable(url, label = 'DATABASE_URL') {
  const normalized = normalizeDatabaseUrl(url)
  let parsed
  try {
    parsed = new URL(normalized, 'postgres://base')
  } catch {
    throw new Error(
      `${label} is malformed. Use a full postgres:// URL and URL-encode special characters in the password (@, #, /, %, :, etc.). ` +
      'Cloud SQL example: postgres://USER:PASSWORD@127.0.0.1/travel_mgr?host=/cloudsql/PROJECT:REGION:INSTANCE'
    )
  }

  if (!parsed.pathname || parsed.pathname === '/') {
    throw new Error(`${label} must include a database name (path after host), e.g. /travel_mgr`)
  }

  if (normalized.includes('/cloudsql/') && !parsed.searchParams.get('host')?.startsWith('/cloudsql/')) {
    throw new Error(
      `${label} for Cloud Run must include query host=/cloudsql/PROJECT:REGION:INSTANCE`
    )
  }

  return normalized
}

module.exports = {
  normalizeDatabaseUrl,
  assertDatabaseUrlParseable,
}
