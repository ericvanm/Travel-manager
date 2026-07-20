const router = require('express').Router()
const { Language } = require('../models/DBmodels')

// GET all languages
router.get('/', async (req, res) => {
  const languages = await Language.findAll()
  res.json(languages)
})

// POST new language
router.post('/', async (req, res) => {
  const language = await Language.create(req.body)
  res.json(language)
})

// PUT update language
router.put('/:id', async (req, res) => {
  const language = await Language.findByPk(req.params.id)
  if (language) {
    await language.update(req.body)
    res.json(language)
  } else {
    res.status(404).json({ error: 'Language not found' })
  }
})

// DELETE language
router.delete('/:id', async (req, res) => {
  const language = await Language.findByPk(req.params.id)
  if (language) {
    await language.destroy()
    res.status(204).end()
  } else {
    res.status(404).json({ error: 'Language not found' })
  }
})

module.exports = router