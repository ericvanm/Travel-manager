const router = require('express').Router()
const { ActivityType } = require('../models/DBmodels')

// GET all activity types
router.get('/', async (req, res) => {
  const activityTypes = await ActivityType.findAll()
  res.json(activityTypes)
})

// POST new activity type
router.post('/', async (req, res) => {
  const activityType = await ActivityType.create(req.body)
  res.json(activityType)
})

// PUT update activity type
router.put('/:id', async (req, res) => {
  const activityType = await ActivityType.findByPk(req.params.id)
  if (activityType) {
    await activityType.update(req.body)
    res.json(activityType)
  } else {
    res.status(404).json({ error: 'Activity type not found' })
  }
})

// DELETE activity type
router.delete('/:id', async (req, res) => {
  const activityType = await ActivityType.findByPk(req.params.id)
  if (activityType) {
    await activityType.destroy()
    res.status(204).end()
  } else {
    res.status(404).json({ error: 'Activity type not found' })
  }
})

module.exports = router