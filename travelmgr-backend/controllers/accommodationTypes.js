const router = require('express').Router()
const { AccommodationType } = require('../models/DBmodels')

// GET all accommodation types
router.get('/', async (req, res) => {
  const accommodationTypes = await AccommodationType.findAll()
  res.json(accommodationTypes)
})

// POST new accommodation type
router.post('/', async (req, res) => {
  const accommodationType = await AccommodationType.create(req.body)
  res.json(accommodationType)
})

// PUT update accommodation type
router.put('/:id', async (req, res) => {
  const accommodationType = await AccommodationType.findByPk(req.params.id)
  if (accommodationType) {
    await accommodationType.update(req.body)
    res.json(accommodationType)
  } else {
    res.status(404).json({ error: 'Accommodation type not found' })
  }
})

// DELETE accommodation type
router.delete('/:id', async (req, res) => {
  const accommodationType = await AccommodationType.findByPk(req.params.id)
  if (accommodationType) {
    await accommodationType.destroy()
    res.status(204).end()
  } else {
    res.status(404).json({ error: 'Accommodation type not found' })
  }
})

module.exports = router