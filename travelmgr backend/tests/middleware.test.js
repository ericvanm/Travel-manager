const { test, describe, mock, afterEach } = require('node:test')
const assert = require('node:assert')
const middleware = require('../utils/middleware')

const createResponse = () => {
  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    send(payload) {
      this.body = payload
      return this
    },
    json(payload) {
      this.body = payload
      return this
    }
  }
  return response
}

describe('middleware', () => {
  afterEach(() => {
    mock.restoreAll()
  })

  test('requestLogger calls next', () => {
    mock.method(console, 'log', () => {})
    let called = false
    middleware.requestLogger({}, createResponse(), () => { called = true })
    assert.strictEqual(called, true)
  })

  test('unknownEndpoint returns 404', () => {
    const response = createResponse()
    middleware.unknownEndpoint({}, response)
    assert.strictEqual(response.statusCode, 404)
    assert.deepStrictEqual(response.body, { error: 'unknown endpoint' })
  })

  test('errorHandler handles CastError', () => {
    const response = createResponse()
    let forwarded = false
    middleware.errorHandler({ name: 'CastError' }, {}, response, () => { forwarded = true })
    assert.strictEqual(response.statusCode, 400)
    assert.strictEqual(forwarded, false)
  })

  test('errorHandler handles SequelizeValidationError', () => {
    const response = createResponse()
    middleware.errorHandler({ name: 'SequelizeValidationError', message: 'invalid' }, {}, response, () => {})
    assert.strictEqual(response.statusCode, 400)
    assert.strictEqual(response.body.error, 'invalid')
  })

  test('errorHandler handles JsonWebTokenError', () => {
    const response = createResponse()
    middleware.errorHandler({ name: 'JsonWebTokenError' }, {}, response, () => {})
    assert.strictEqual(response.statusCode, 400)
  })

  test('errorHandler forwards unknown errors', () => {
    const error = new Error('unexpected')
    let forwardedError = null
    middleware.errorHandler(error, {}, createResponse(), (nextError) => {
      forwardedError = nextError
    })
    assert.strictEqual(forwardedError, error)
  })

  test('tokenExtractor sets request.user from session', () => {
    const request = {
      session: {
        isLoggedIn: true,
        user: { id: 42, username: 'alice' }
      }
    }
    let called = false
    middleware.tokenExtractor(request, createResponse(), () => { called = true })
    assert.strictEqual(request.user, 42)
    assert.strictEqual(called, true)
  })

  test('errorHandler handles ValidationError and duplicate key errors', () => {
    const validationResponse = createResponse()
    middleware.errorHandler({ name: 'ValidationError', message: 'invalid payload' }, {}, validationResponse, () => {})
    assert.strictEqual(validationResponse.statusCode, 400)

    const duplicateResponse = createResponse()
    middleware.errorHandler({
      name: 'MongoServerError',
      message: 'E11000 duplicate key error collection'
    }, {}, duplicateResponse, () => {})
    assert.strictEqual(duplicateResponse.statusCode, 400)
    assert.strictEqual(duplicateResponse.body.error, 'expected `username` to be unique')
  })
})
