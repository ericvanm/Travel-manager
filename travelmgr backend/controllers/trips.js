const router = require('express').Router()
const { Trip, Stage, Activity, Transport, Accommodation, Expense } = require('../models/DBmodels')

// GET all trips with details
router.get('/', async (req, res) => {
  try {
    const trips = await Trip.findAll()
    res.json(trips)
  } catch (error) {
    console.error('Error fetching trips:', error)
    res.status(500).json({ error: 'Failed to fetch trips' })
  }
})

// GET single trip
router.get('/:id', async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id)
    if (trip) {
      res.json(trip)
    } else {
      res.status(404).json({ error: 'Trip not found' })
    }
  } catch (error) {
    console.error('Error fetching trip:', error)
    res.status(500).json({ error: 'Failed to fetch trip' })
  }
})

// POST new trip
router.post('/', async (req, res) => {
  try {
    const trip = await Trip.create(req.body)
    res.json(trip)
  } catch (error) {
    console.error('Error creating trip:', error)
    res.status(500).json({ error: 'Failed to create trip' })
  }
})

// PUT update trip
router.put('/:id', async (req, res) => {
  const trip = await Trip.findByPk(req.params.id)
  if (trip) {
    await trip.update(req.body)
    res.json(trip)
  } else {
    res.status(404).json({ error: 'Trip not found' })
  }
})

// DELETE trip
router.delete('/:id', async (req, res) => {
  const trip = await Trip.findByPk(req.params.id)
  if (trip) {
    await trip.destroy()
    res.status(204).end()
  } else {
    res.status(404).json({ error: 'Trip not found' })
  }
})

module.exports = router