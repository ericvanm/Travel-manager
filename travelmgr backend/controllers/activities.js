const router = require('express').Router()
const { Activity, ActivityType, Stage } = require('../models/DBmodels')

// GET all activities for a stage
router.get('/stage/:stageId', async (req, res) => {
  try {
    const activities = await Activity.findAll({
      where: { stageId: req.params.stageId },
      include: [{ model: ActivityType }]
    })
    res.json(activities)
  } catch (error) {
    console.error('Error fetching activities:', error)
    res.status(500).json({ error: 'Failed to fetch activities' })
  }
})

// GET single activity
router.get('/:id', async (req, res) => {
  try {
    const activity = await Activity.findByPk(req.params.id, {
      include: [{ model: ActivityType }]
    })
    if (activity) {
      res.json(activity)
    } else {
      res.status(404).json({ error: 'Activity not found' })
    }
  } catch (error) {
    console.error('Error fetching activity:', error)
    res.status(500).json({ error: 'Failed to fetch activity' })
  }
})

// POST new activity
router.post('/', async (req, res) => {
  try {
    console.log('Creating activity with data:', req.body)
    const activity = await Activity.create(req.body)
    res.json(activity)
  } catch (error) {
    console.error('Error creating activity:', error)
    console.error('Error details:', error.message)
    res.status(500).json({ error: 'Failed to create activity', details: error.message })
  }
})

// PUT update activity
router.put('/:id', async (req, res) => {
  try {
    const activity = await Activity.findByPk(req.params.id)
    if (activity) {
      await activity.update(req.body)
      res.json(activity)
    } else {
      res.status(404).json({ error: 'Activity not found' })
    }
  } catch (error) {
    console.error('Error updating activity:', error)
    res.status(500).json({ error: 'Failed to update activity' })
  }
})

// DELETE activity
router.delete('/:id', async (req, res) => {
  try {
    const activity = await Activity.findByPk(req.params.id)
    if (activity) {
      await activity.destroy()
      res.status(204).end()
    } else {
      res.status(404).json({ error: 'Activity not found' })
    }
  } catch (error) {
    console.error('Error deleting activity:', error)
    res.status(500).json({ error: 'Failed to delete activity' })
  }
})

module.exports = router