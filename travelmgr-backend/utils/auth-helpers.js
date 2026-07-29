const jwt = require('jsonwebtoken')
const { User } = require('../models/DBmodels')
const { SECRET } = require('./config')

const LANGUAGE_LABELS = {
  en: 'English',
  fr: 'French',
  es: 'Spanish',
  nl: 'Dutch'
}

const buildUserPayload = (user) => ({
  id: user.id,
  username: user.username,
  name: user.name,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  language: user.language || 'en',
  defaultDepartureLocation: user.defaultDepartureLocation || null,
  role: user.role || 'user',
  mustSetPassword: Boolean(user.mustSetPassword),
  readOnly: Boolean(user.readOnly)
})

const optionalAuth = (req, _res, next) => {
  if (req.session?.isLoggedIn && req.session.user) {
    req.user = req.session.user
    return next()
  }
  const token = req.session?.token
  if (token) {
    try {
      req.user = jwt.verify(token, SECRET || process.env.SECRET)
    } catch {
      req.user = null
    }
  }
  next()
}

const requireAuth = (req, res, next) => {
  if (req.session?.isLoggedIn && req.session.user) {
    req.user = req.session.user
    return next()
  }
  const token = req.session?.token
  if (!token) {
    return res.status(401).json({ error: 'Access denied' })
  }
  try {
    req.user = jwt.verify(token, SECRET || process.env.SECRET)
    next()
  } catch {
    res.status(400).json({ error: 'Invalid token' })
  }
}

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

const getUserId = (req) => req.user?.id || null

const getUserLanguage = async (req, fallback = 'fr') => {
  const userId = getUserId(req)
  if (!userId) return fallback
  try {
    const user = await User.findByPk(userId, { attributes: ['language'] })
    return user?.language || fallback
  } catch {
    return fallback
  }
}

const getLanguageLabel = (code) => LANGUAGE_LABELS[code] || LANGUAGE_LABELS.fr

module.exports = {
  optionalAuth,
  requireAuth,
  requireAdmin,
  getUserId,
  getUserLanguage,
  getLanguageLabel,
  buildUserPayload,
  LANGUAGE_LABELS
}
