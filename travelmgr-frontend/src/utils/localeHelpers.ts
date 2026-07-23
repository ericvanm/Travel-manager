const LANGUAGE_LOCALE: Record<string, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  es: 'es-ES',
  nl: 'nl-NL',
}

export const getLocaleFromLanguage = (language: string): string =>
  LANGUAGE_LOCALE[language] || LANGUAGE_LOCALE.en

export const formatDateLong = (
  dateStr: string,
  language: string,
  timeZone = 'UTC'
): string => {
  const locale = getLocaleFromLanguage(language)
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone,
  })
}

export const formatTime = (
  dateTime: string,
  language: string,
  timeZone = 'UTC'
): string => {
  const locale = getLocaleFromLanguage(language)
  return new Date(dateTime).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  })
}

export const formatDateTime = (
  dateTime: string,
  language: string,
  timeZone = 'UTC'
): string => {
  const locale = getLocaleFromLanguage(language)
  return new Date(dateTime).toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  })
}

export const formatDateOnly = (
  dateStr: string,
  language: string,
  timeZone = 'UTC'
): string => {
  const locale = getLocaleFromLanguage(language)
  const raw = dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00Z`
  return new Date(raw).toLocaleDateString(locale, { timeZone })
}

export const formatCurrencyAmount = (amount: number, currency: string, language: string): string => {
  const locale = getLocaleFromLanguage(language)
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
  } catch {
    return `${amount} ${currency}`
  }
}

/** Maps legacy API error messages to translation keys. */
const API_ERROR_KEYS: Record<string, string> = {
  'Username already exists': 'username_exists',
  'Invalid username or password': 'invalid_credentials',
  'Registration failed': 'registration_failed',
}

type TranslateFn = (key: string, params?: Record<string, unknown>) => string

/** Resolves an API error code or message through i18n, with a translated fallback. */
export const translateApiError = (
  t: TranslateFn,
  error: string | undefined,
  fallbackKey: string
): string => {
  if (!error) {
    return t(fallbackKey)
  }
  const translationKey = API_ERROR_KEYS[error] ?? error
  const message = t(translationKey)
  return message !== translationKey ? message : t(fallbackKey)
}
