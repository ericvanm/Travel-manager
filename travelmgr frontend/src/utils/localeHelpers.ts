const LANGUAGE_LOCALE: Record<string, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  es: 'es-ES',
  nl: 'nl-NL',
}

export const getLocaleFromLanguage = (language: string): string =>
  LANGUAGE_LOCALE[language] || LANGUAGE_LOCALE.en

export const formatDateLong = (dateStr: string, language: string): string => {
  const locale = getLocaleFromLanguage(language)
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export const formatTime = (dateTime: string, language: string): string => {
  const locale = getLocaleFromLanguage(language)
  return new Date(dateTime).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

export const formatCurrencyAmount = (amount: number, currency: string, language: string): string => {
  const locale = getLocaleFromLanguage(language)
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
  } catch {
    return `${amount} ${currency}`
  }
}
