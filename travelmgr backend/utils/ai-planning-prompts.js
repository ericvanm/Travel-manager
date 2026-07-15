const fs = require('fs')
const path = require('path')

const DEFAULT_CONFIG_PATH = path.join(__dirname, '..', 'config', 'ai-planning-prompts.json')

let cache = { mtimeMs: 0, config: null }

const renderTemplate = (template, variables) => {
  if (!template) return ''
  return String(template).replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = variables[key]
    return value == null ? '' : String(value)
  })
}

const loadPromptsConfig = () => {
  const configPath = process.env.AI_PLANNING_PROMPTS_PATH || DEFAULT_CONFIG_PATH

  try {
    const stat = fs.statSync(configPath)
    if (cache.config && cache.mtimeMs === stat.mtimeMs) {
      return cache.config
    }
    const raw = fs.readFileSync(configPath, 'utf8')
    cache = { mtimeMs: stat.mtimeMs, config: JSON.parse(raw) }
    return cache.config
  } catch (error) {
    console.error(`Failed to load AI planning prompts from ${configPath}:`, error.message)
    throw error
  }
}

const buildFormVariables = (formData, language = 'fr') => ({
  departureLocation: formData.departureLocation,
  geographicZone: formData.geographicZone,
  durationDays: formData.durationDays,
  startDate: formData.startDate || 'flexible',
  travelStyle: formData.travelStyle,
  localTransport: formData.localTransport,
  accommodationType: formData.accommodationType,
  budget: formData.budget,
  currency: formData.currency,
  language,
  languageLabel: { en: 'English', fr: 'French', es: 'Spanish', nl: 'Dutch' }[language] || 'French'
})

const buildLanguageBlock = (language) => {
  const config = loadPromptsConfig()
  const vars = buildFormVariables({}, language)
  return renderTemplate(config.languageInstruction || '', vars)
}

const buildBaseContext = (formData, language = 'fr') => {
  const config = loadPromptsConfig()
  const vars = buildFormVariables(formData, language)
  const lines = (config.formFieldLines || []).map((line) => renderTemplate(line, vars))
  const languageBlock = buildLanguageBlock(language)
  return `${languageBlock ? `${languageBlock}\n\n` : ''}${config.baseContextIntro}\n${lines.join('\n')}`
}

const buildRevisionBlock = (revisionFeedback, previousItinerary) => {
  if (!revisionFeedback) return ''
  const config = loadPromptsConfig()
  const block = renderTemplate(config.revisionBlockTemplate || '', {
    revisionFeedback,
    previousItinerary: JSON.stringify(previousItinerary)
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

${config.itineraryRules}`
}

const getSystemMessage = (language = 'fr') => {
  const config = loadPromptsConfig()
  const vars = buildFormVariables({}, language)
  return renderTemplate(config.systemMessage || '', vars) || config.systemMessage
}

module.exports = {
  loadPromptsConfig,
  buildSynthesisPrompt,
  buildItineraryPrompt,
  getSystemMessage,
  renderTemplate,
  DEFAULT_CONFIG_PATH
}
