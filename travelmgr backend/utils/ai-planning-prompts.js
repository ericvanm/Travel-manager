const fs = require('fs')
const path = require('path')
const { sanitizeForLlm } = require('./log-sanitizer')

const DEFAULT_CONFIG_PATH = path.join(__dirname, '..', 'config', 'ai-planning-prompts.json')

const EMPTY_CONFIG = {
  languageInstruction: '',
  formFieldLines: [],
  baseContextIntro: '',
  revisionBlockTemplate: '',
  synthesisInstructions: '',
  synthesisJsonSchema: '',
  itineraryInstructions: '',
  itineraryJsonSchema: '',
  itineraryRules: '',
  systemMessage: ''
}

let cache = { mtimeMs: 0, config: EMPTY_CONFIG }

const renderTemplate = (template, variables) => {
  if (!template) return ''
  return String(template).replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = variables[key]
    return value == null ? '' : String(value)
  })
}

const normalizePromptsConfig = (raw) => ({
  languageInstruction: String(raw?.languageInstruction || ''),
  formFieldLines: Array.isArray(raw?.formFieldLines) ? raw.formFieldLines : [],
  baseContextIntro: String(raw?.baseContextIntro || ''),
  revisionBlockTemplate: String(raw?.revisionBlockTemplate || ''),
  synthesisInstructions: String(raw?.synthesisInstructions || ''),
  synthesisJsonSchema: String(raw?.synthesisJsonSchema || ''),
  itineraryInstructions: String(raw?.itineraryInstructions || ''),
  itineraryJsonSchema: String(raw?.itineraryJsonSchema || ''),
  itineraryRules: String(raw?.itineraryRules || ''),
  systemMessage: String(raw?.systemMessage || '')
})

const loadPromptsConfig = () => {
  const configPath = process.env.AI_PLANNING_PROMPTS_PATH || DEFAULT_CONFIG_PATH

  try {
    const stat = fs.statSync(configPath)
    if (cache.config && cache.mtimeMs === stat.mtimeMs) {
      return cache.config
    }
    const raw = fs.readFileSync(configPath, 'utf8')
    cache = { mtimeMs: stat.mtimeMs, config: normalizePromptsConfig(JSON.parse(raw)) }
    return cache.config
  } catch (error) {
    console.error(`Failed to load AI planning prompts from ${configPath}:`, error.message)
    throw error
  }
}

const buildFormVariables = (formData, language = 'fr') => {
  const { formatInspirationSitesForPrompt } = require('./activity-inspiration-sites')
  return {
    departureLocation: formData.departureLocation,
    geographicZone: formData.geographicZone,
    durationDays: formData.durationDays,
    startDate: formData.startDate || 'flexible',
    travelStyle: formData.travelStyle,
    localTransport: formData.localTransport,
    accommodationType: formData.accommodationType,
    budget: formData.budget,
    currency: formData.currency,
    minActivityHoursPerDay: formData.minActivityHoursPerDay ?? 4,
    maxActivityHoursPerDay: formData.maxActivityHoursPerDay ?? 8,
    activityInspirationSites: formatInspirationSitesForPrompt(formData),
    expectedActivitiesPerDay: Math.max(
      1,
      Math.ceil(((formData.minActivityHoursPerDay ?? 4) + (formData.maxActivityHoursPerDay ?? 8)) / 4)
    ),
    remarks: String(formData.remarks || '').trim() || '(aucune)',
    language,
    languageLabel: { en: 'English', fr: 'French', es: 'Spanish', nl: 'Dutch' }[language] || 'French'
  }
}

const buildLanguageBlock = (language) => {
  const config = loadPromptsConfig()
  const vars = buildFormVariables({}, language)
  return renderTemplate(config.languageInstruction, vars)
}

const buildBaseContext = (formData, language = 'fr') => {
  const config = loadPromptsConfig()
  const vars = buildFormVariables(formData, language)
  const lines = config.formFieldLines.map((line) => renderTemplate(line, vars))
  const languageBlock = buildLanguageBlock(language)
  return `${languageBlock ? `${languageBlock}\n\n` : ''}${config.baseContextIntro}\n${lines.join('\n')}`
}

const buildRevisionBlock = (revisionFeedback, previousItinerary) => {
  if (!revisionFeedback) return ''
  const config = loadPromptsConfig()
  const block = renderTemplate(config.revisionBlockTemplate, {
    revisionFeedback,
    previousItinerary: JSON.stringify(sanitizeForLlm(previousItinerary))
  })
  return block ? `\n${block}\n` : ''
}

const buildSynthesisPrompt = (formData, language = 'fr') => {
  const config = loadPromptsConfig()
  return `${buildBaseContext(formData, language)}

${config.synthesisInstructions}
${config.synthesisJsonSchema}`
}

const buildItineraryPrompt = (formData, previousItinerary, revisionFeedback, language = 'fr') => {
  const config = loadPromptsConfig()
  const revisionBlock = buildRevisionBlock(revisionFeedback, previousItinerary)
  return `${buildBaseContext(formData, language)}${revisionBlock}

${config.itineraryInstructions}

Structure JSON exacte :
${config.itineraryJsonSchema}

${renderTemplate(config.itineraryRules, buildFormVariables(formData, language))}`
}

const getSystemMessage = (language = 'fr') => {
  const config = loadPromptsConfig()
  const vars = buildFormVariables({}, language)
  return renderTemplate(config.systemMessage, vars) || config.systemMessage
}

module.exports = {
  loadPromptsConfig,
  buildSynthesisPrompt,
  buildItineraryPrompt,
  getSystemMessage,
  renderTemplate,
  DEFAULT_CONFIG_PATH
}
