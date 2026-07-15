const jwt = require('jsonwebtoken')
const { User } = require('../models/DBmodels')

const LANGUAGE_LABELS = {
  en: 'English',
  fr: 'French',
  es: 'Spanish',
  nl: 'Dutch'
}

const optionalAuth = (req, _res, next) => {
  if (req.session?.isLoggedIn && req.session.user) {
    req.user = req.session.user
    return next()
  }
  const token = req.session?.token
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.SECRET)
    } catch {
      req.user = null
    }
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
  getUserId,
  getUserLanguage,
  getLanguageLabel,
  LANGUAGE_LABELS
}
