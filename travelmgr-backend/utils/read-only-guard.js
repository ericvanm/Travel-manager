const jwt = require('jsonwebtoken')
const { SECRET } = require('./config')

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

const PUBLIC_AUTH_WRITE_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/setup-initial-password'
])

/**
 * Blocks mutating API calls for users with readOnly flag in their session JWT.
 */
const blockReadOnlyWrites = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    return next()
  }

  const path = req.originalUrl.split('?')[0]
  if (PUBLIC_AUTH_WRITE_PATHS.has(path)) {
    return next()
  }

  const token = req.session?.token
  if (!token) {
    return next()
  }

  try {
    const decoded = jwt.verify(token, SECRET || process.env.SECRET)
    if (decoded.readOnly) {
      return res.status(403).json({ error: 'read_only_user' })
    }
  } catch {
    // requireAuth on protected routes will handle invalid tokens
  }

  next()
}

module.exports = { blockReadOnlyWrites }
