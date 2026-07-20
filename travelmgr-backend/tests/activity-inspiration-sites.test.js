const { test, describe } = require('node:test')
const assert = require('node:assert')
const {
  listDefaultSiteNames,
  listAvailableInspirationSites,
  resolveInspirationSites,
  formatInspirationSitesForPrompt,
  renderSiteUrl
} = require('../utils/activity-inspiration-sites')

describe('activity-inspiration-sites', () => {
  test('lists default site names from config', () => {
    const names = listDefaultSiteNames()
    assert.ok(names.length > 0)
    assert.ok(names.includes('GetYourGuide'))
  })

  test('lists available inspiration sites', () => {
    const sites = listAvailableInspirationSites()
    assert.ok(sites.some((site) => site.name === 'Viator'))
  })

  test('resolves selected sites from form data', () => {
    const sites = resolveInspirationSites({ activityInspirationSites: ['GetYourGuide', 'Klook'] })
    assert.strictEqual(sites.length, 2)
    assert.ok(sites.every((site) => site.urlTemplate.includes('{{query}}')))
  })

  test('formats inspiration sites for prompt', () => {
    const formatted = formatInspirationSitesForPrompt({ activityInspirationSites: 'Viator' })
    assert.strictEqual(formatted, 'Viator')
  })

  test('renders site URL with encoded query', () => {
    const url = renderSiteUrl('https://example.com/search?q={{query}}', 'Paris tour')
    assert.ok(url.includes('Paris'))
    assert.ok(!url.includes('{{query}}'))
  })
})
