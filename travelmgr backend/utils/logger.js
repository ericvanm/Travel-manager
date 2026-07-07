const { sanitizeObject } = require('./log-sanitizer')

const assertStaticMessage = (message) => String(message)

const info = (message) => {
  console.log(assertStaticMessage(message))
}

const infoWithContext = (message, context) => {
  console.log(assertStaticMessage(message), JSON.stringify(sanitizeObject(context)))
}

const infoWithCounts = (message, ...counts) => {
  const safeCounts = counts.filter(
    (value) => typeof value === 'number' || typeof value === 'boolean'
  )
  console.log(assertStaticMessage(message), ...safeCounts.map(String))
}

const error = (message, err) => {
  const baseMessage = assertStaticMessage(message)
  if (err instanceof Error) {
    console.error(baseMessage, err.message)
    return
  }
  console.error(baseMessage)
}

module.exports = {
  info,
  infoWithContext,
  infoWithCounts,
  error
}
