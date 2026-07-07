const { sanitizeParams } = require('./log-sanitizer')

const isSafePrimitive = (value) => (
  value === null
  || value === undefined
  || typeof value === 'number'
  || typeof value === 'boolean'
)

const toSafeLogValue = (value) => {
  if (isSafePrimitive(value)) {
    return value
  }

  if (typeof value === 'string') {
    return sanitizeParams([value])[0]
  }

  return sanitizeParams([value])[0]
}

const writeLog = (writer, ...params) => {
  writer(...params.map(toSafeLogValue))
}

const info = (...params) => {
  writeLog(console.log, ...params)
}

const error = (...params) => {
  writeLog(console.error, ...params)
}

module.exports = {
  info, error
}
