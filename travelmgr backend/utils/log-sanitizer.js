const SENSITIVE_KEY = /password|secret|token|authorization|cookie|api[_-]?key|credential/i
const CONNECTION_URL = /^(postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\//i

const redactConnectionUrl = (url) => {
  if (typeof url !== 'string' || !CONNECTION_URL.test(url)) {
    return url
  }

  try {
    const parsed = new URL(url)
    const port = parsed.port ? `:${parsed.port}` : ''
    return `${parsed.protocol}//${parsed.hostname}${port}${parsed.pathname}`
  } catch {
    return '[REDACTED DATABASE URL]'
  }
}

const sanitizeValue = (value) => {
  if (value === null || value === undefined) {
    return value
  }
  if (typeof value === 'string') {
    const redactedUrl = redactConnectionUrl(value)
    if (redactedUrl !== value) {
      return redactedUrl
    }
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

const sanitizeParams = (params) => params.map(sanitizeValue)

module.exports = { sanitizeParams, redactConnectionUrl }
