const logger = require('./logger')

const requestLogger = (request, response, next) => {
  logger.info('HTTP request received')
  next()
}

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' })
}

const errorHandler = (error, request, response, next) => {
  if (error.name === 'SequelizeValidationError') {
    return response.status(400).json({ error: error.message })
  } else if (error.name === 'ValidationError') {
    return response.status(400).json({ error: error.message })
  } else if (error.name === 'JsonWebTokenError') {
    return response.status(400).json({ error: 'token missing or invalid' })
  }

  next(error)
}

const tokenExtractor = (request, response, next) => {
  const sessionData = request.session
  if (sessionData?.isLoggedIn) {
    request.user = sessionData.user.id
  }
  next()
}
module.exports = {
  requestLogger,
  unknownEndpoint,
  errorHandler,
  tokenExtractor
}