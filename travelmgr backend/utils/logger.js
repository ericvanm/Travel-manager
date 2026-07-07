const { sanitizeParams } = require('./log-sanitizer')

const info = (...params) => {
  console.log(...sanitizeParams(params))
}

const error = (...params) => {
  console.error(...sanitizeParams(params))
}

module.exports = {
  info, error
}
