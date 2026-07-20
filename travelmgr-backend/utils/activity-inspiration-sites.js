const fs = require('fs')
const path = require('path')

const DEFAULT_CONFIG_PATH = path.join(__dirname, '..', 'config', 'activity-inspiration-sites.json')

const EMPTY_CONFIG = { sites: [], defaultSiteNames: [] }

let cache = { mtimeMs: 0, config: EMPTY_CONFIG }

const normalizeInspirationConfig = (raw) => ({
  sites: Array.isArray(raw?.sites) ? raw.sites : [],
  defaultSiteNames: Array.isArray(raw?.defaultSiteNames) ? raw.defaultSiteNames : []
})

const loadInspirationSitesConfig = () => {
  const configPath = process.env.ACTIVITY_INSPIRATION_SITES_PATH || DEFAULT_CONFIG_PATH
  const stat = fs.statSync(configPath)
  if (cache.config && cache.mtimeMs === stat.mtimeMs) return cache.config
  const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  cache = { mtimeMs: stat.mtimeMs, config: normalizeInspirationConfig(parsed) }
  return cache.config
}

const encodeQuery = (value) => encodeURIComponent(String(value || '').trim())

const renderSiteUrl = (template, query) =>
  String(template || '').replace(/\{\{query\}\}/g, encodeQuery(query))

const listDefaultSiteNames = () => {
  const config = loadInspirationSitesConfig()
  if (config.defaultSiteNames.length > 0) return config.defaultSiteNames
  return config.sites.map((s) => s.name)
}

const resolveInspirationSites = (formData = {}) => {
  const config = loadInspirationSitesConfig()
  const raw = formData.activityInspirationSites
  const names = Array.isArray(raw)
    ? raw
    : String(raw || '')
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean)

  const selected = names.length > 0 ? names : listDefaultSiteNames()
  return config.sites.filter((site) =>
    selected.some((name) => name.toLowerCase() === site.name.toLowerCase())
  )
}

const formatInspirationSitesForPrompt = (formData = {}) => {
  const sites = resolveInspirationSites(formData)
  if (sites.length === 0) return 'GetYourGuide, Viator'
  return sites.map((s) => s.name).join(', ')
}

module.exports = {
  loadInspirationSitesConfig,
  listDefaultSiteNames,
  listAvailableInspirationSites: () => {
    const config = loadInspirationSitesConfig()
    return config.sites.map(({ name }) => ({ name }))
  },
  resolveInspirationSites,
  formatInspirationSitesForPrompt,
  renderSiteUrl
}
