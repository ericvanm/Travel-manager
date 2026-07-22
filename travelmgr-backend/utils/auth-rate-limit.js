const rateLimit = require('express-rate-limit')

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_requests' },
  skip: () => process.env.NODE_ENV === 'test'
})

module.exports = { authRateLimit }
