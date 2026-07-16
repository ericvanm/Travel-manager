const SENSITIVE_KEY = /password|secret|token|authorization|cookie|api[_-]?key|credential/i
const LLM_SENSITIVE_KEY = /password|secret|token|authorization|cookie|api[_-]?key|credential|confirmation|bookingcode|booking_code|phone|seat\b|gate\b/i
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

const buildDatabaseLogContext = (dbUri, environment) => {
  const context = { environment: environment || 'unknown' }

  if (typeof dbUri !== 'string' || !CONNECTION_URL.test(dbUri)) {
    return context
  }

  try {
    const parsed = new URL(dbUri)
    context.host = parsed.hostname
    if (parsed.port) {
      context.port = parsed.port
    }
    const database = parsed.pathname.replace(/^\//, '')
    if (database) {
      context.database = database
    }
  } catch {
    // Keep environment-only context when the URI cannot be parsed.
  }

  return context
}

const sanitizeValueWithKey = (value, keyPattern) => {
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
    return value.map((entry) => sanitizeValueWithKey(entry, keyPattern))
  }
  if (typeof value === 'object') {
    return sanitizeObjectWithKey(value, keyPattern)
  }
  return value
}

const sanitizeObjectWithKey = (obj, keyPattern) => {
  if (!obj || typeof obj !== 'object') {
    return obj
  }

  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      if (keyPattern.test(key)) {
        return [key, '[REDACTED]']
      }
      return [key, sanitizeValueWithKey(value, keyPattern)]
    })
  )
}

const sanitizeValue = (value) => sanitizeValueWithKey(value, SENSITIVE_KEY)

const sanitizeObject = (obj) => sanitizeObjectWithKey(obj, SENSITIVE_KEY)

const sanitizeForLlm = (value) => sanitizeValueWithKey(value, LLM_SENSITIVE_KEY)

const sanitizeLlmMessages = (messages) =>
  (Array.isArray(messages) ? messages : []).map((message) => ({
    role: message.role,
    content: typeof message.content === 'string'
      ? message.content
      : sanitizeForLlm(message.content)
  }))

const sanitizeParams = (params) => params.map(sanitizeValue)

module.exports = {
  sanitizeParams,
  sanitizeObject,
  sanitizeForLlm,
  sanitizeLlmMessages,
  redactConnectionUrl,
  buildDatabaseLogContext
}
