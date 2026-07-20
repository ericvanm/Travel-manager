const router = require('express').Router()
const { TransportType } = require('../models/DBmodels')

// GET all transport types
router.get('/', async (req, res) => {
  const transportTypes = await TransportType.findAll()
  res.json(transportTypes)
})

// POST new transport type
router.post('/', async (req, res) => {
  const transportType = await TransportType.create(req.body)
  res.json(transportType)
})

// PUT update transport type
router.put('/:id', async (req, res) => {
  const transportType = await TransportType.findByPk(req.params.id)
  if (transportType) {
    await transportType.update(req.body)
    res.json(transportType)
  } else {
    res.status(404).json({ error: 'Transport type not found' })
  }
})

// DELETE transport type
router.delete('/:id', async (req, res) => {
  const transportType = await TransportType.findByPk(req.params.id)
  if (transportType) {
    await transportType.destroy()
    res.status(204).end()
  } else {
    res.status(404).json({ error: 'Transport type not found' })
  }
})

module.exports = router