const logger = require('./logger')
const jwt = require('jsonwebtoken')
const { SECRET } = require('./config')

const requestLogger = (request, response, next) => {
  logger.info('Method:', request.method)
  logger.info('Path:', request.path)
  next()
}

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' })
}

const errorHandler = (error, request, response, next) => {
  if (error.name === 'CastError') {
    return response.status(400).send({ error: 'malformatted id' })
  } else if (error.name === 'SequelizeValidationError') {
    return response.status(400).json({ error: error.message })
  } else if (error.name === 'ValidationError') {
    return response.status(400).json({ error: error.message })
  } else if (error.name === 'MongoServerError' && error.message.includes('E11000 duplicate key error')) {
    return response.status(400).json({ error: 'expected `username` to be unique' })

  } else if (error.name ===  'JsonWebTokenError') {
    return response.status(400).json({ error: 'token missing or invalid' })
  }

  next(error)
}

const tokenExtractor = (request, response, next) => {
// updated for support express-session

  const sessionData = request.session
  console.log("sessionData", sessionData)
  // check if session stil valid
  if (sessionData?.isLoggedIn) {

    request.user = sessionData.user.id
  }
  
/*
  const authorization = request.get('authorization')

  if (authorization && authorization.startsWith('Bearer ')) {
    request.token = authorization.replace('Bearer ', '')
    
    try {
      const decodedToken = jwt.verify(request.token, SECRET)
      if (!decodedToken.id) {
      return response.status(401).json({ error: 'token invalid' })
      }
      request.user = decodedToken.id
    } catch{      
      return response.status(401).json({ error: 'token invalid' })     
    }
    
  } */
  next()
}
module.exports = {
  requestLogger,
  unknownEndpoint,
  errorHandler,
  tokenExtractor
}