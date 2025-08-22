const router = require('express').Router()
const { Stage, Country, Activity, Transport, Accommodation, ActivityType } = require('../models/DBmodels')

// GET all stages for a trip
router.get('/trip/:tripId', async (req, res) => {
  try {
    const stages = await Stage.findAll({
      where: { tripId: req.params.tripId },
      include: [
        { model: Country, as: 'Country' },
        { 
          model: Activity,
          include: [{ model: ActivityType }]
        },
        { model: Transport },
        { model: Accommodation }
      ],
      order: [['startDate', 'ASC']]
    })
    res.json(stages)
  } catch (error) {
    console.error('Error fetching stages:', error)
    res.status(500).json({ error: 'Failed to fetch stages' })
  }
})

// GET single stage
router.get('/:id', async (req, res) => {
  try {
    const stage = await Stage.findByPk(req.params.id, {
      include: [
        { model: Country, as: 'Country' },
        { 
          model: Activity,
          include: [{ model: ActivityType }]
        },
        { model: Transport },
        { model: Accommodation }
      ]
    })
    if (stage) {
      res.json(stage)
    } else {
      res.status(404).json({ error: 'Stage not found' })
    }
  } catch (error) {
    console.error('Error fetching stage:', error)
    res.status(500).json({ error: 'Failed to fetch stage' })
  }
})

// POST new stage
router.post('/', async (req, res) => {
  try {
    const stage = await Stage.create(req.body)
    res.json(stage)
  } catch (error) {
    console.error('Error creating stage:', error)
    res.status(500).json({ error: 'Failed to create stage' })
  }
})

// PUT update stage
router.put('/:id', async (req, res) => {
  try {
    const stage = await Stage.findByPk(req.params.id)
    if (stage) {
      await stage.update(req.body)
      res.json(stage)
    } else {
      res.status(404).json({ error: 'Stage not found' })
    }
  } catch (error) {
    console.error('Error updating stage:', error)
    res.status(500).json({ error: 'Failed to update stage' })
  }
})

// DELETE stage
router.delete('/:id', async (req, res) => {
  try {
    const stage = await Stage.findByPk(req.params.id)
    if (stage) {
      await stage.destroy()
      res.status(204).end()
    } else {
      res.status(404).json({ error: 'Stage not found' })
    }
  } catch (error) {
    console.error('Error deleting stage:', error)
    res.status(500).json({ error: 'Failed to delete stage' })
  }
})

module.exports = router