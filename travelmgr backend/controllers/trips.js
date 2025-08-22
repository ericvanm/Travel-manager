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
  try {
    const trip = await Trip.findByPk(req.params.id)
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' })
    }

    // Count stages and activities to inform user
    const stages = await Stage.findAll({ where: { tripId: req.params.id } })
    let totalActivities = 0
    
    for (const stage of stages) {
      const activities = await Activity.findAll({ where: { stageId: stage.id } })
      totalActivities += activities.length
    }

    // Delete all activities first
    for (const stage of stages) {
      await Activity.destroy({ where: { stageId: stage.id } })
    }

    // Delete all stages
    await Stage.destroy({ where: { tripId: req.params.id } })

    // Delete the trip
    await trip.destroy()

    const message = `Voyage "${trip.name}" supprimé avec succès. ${stages.length} étape(s) et ${totalActivities} activité(s) ont également été supprimées.`
    
    res.json({ message })
  } catch (error) {
    console.error('Error deleting trip:', error)
    res.status(500).json({ error: 'Failed to delete trip' })
  }
})

module.exports = router