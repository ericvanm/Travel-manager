const SENSITIVE_KEY = /password|secret|token|authorization|cookie|api[_-]?key|credential/i

const sanitizeValue = (value) => {
  if (value === null || value === undefined) {
    return value
  }
  if (typeof value === 'string') {
    return value.length > 120 ? `${value.slice(0, 120)}…` : value
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue)
  }
  if (typeof value === 'object') {
    return sanitizeObject(value)
  }
  return value
}

const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return obj
  }

  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      if (SENSITIVE_KEY.test(key)) {
        return [key, '[REDACTED]']
      }
      return [key, sanitizeValue(value)]
    })
  )
}

const sanitizeParams = (params) => params.map((param) => {
  if (param && typeof param === 'object') {
    return sanitizeObject(param)
  }
  return param
})

module.exports = { sanitizeParams }
