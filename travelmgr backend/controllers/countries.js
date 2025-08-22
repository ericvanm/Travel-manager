const router = require('express').Router()
const { Country, Translation, Language } = require('../models/DBmodels')
const { Op } = require('sequelize')

// GET all countries with translations
router.get('/', async (req, res) => {
  try {
    const lang = req.query.lang || 'en'
    
    // Get countries with translations using raw query to avoid association issues
    const query = `
      SELECT DISTINCT c.id, c.code, 
             COALESCE(t.translated_text, c.name) as name
      FROM countries c
      LEFT JOIN translations t ON c.id = t.entity_id 
        AND t.entity_type = 'country' 
        AND t.field_name = 'name'
        AND t.language_id = (SELECT id FROM languages WHERE code = :lang)
      ORDER BY name ASC
    `
    
    const countries = await Country.sequelize.query(query, {
      replacements: { lang },
      type: Country.sequelize.QueryTypes.SELECT
    })
    
    res.json(countries)
  } catch (error) {
    console.error('Error fetching countries:', error)
    res.status(500).json({ error: 'Failed to fetch countries' })
  }
})

// POST new country
router.post('/', async (req, res) => {
  const country = await Country.create(req.body)
  res.json(country)
})

// PUT update country
router.put('/:id', async (req, res) => {
  const country = await Country.findByPk(req.params.id)
  if (country) {
    await country.update(req.body)
    res.json(country)
  } else {
    res.status(404).json({ error: 'Country not found' })
  }
})

// DELETE country
router.delete('/:id', async (req, res) => {
  const country = await Country.findByPk(req.params.id)
  if (country) {
    await country.destroy()
    res.status(204).end()
  } else {
    res.status(404).json({ error: 'Country not found' })
  }
})

module.exports = router