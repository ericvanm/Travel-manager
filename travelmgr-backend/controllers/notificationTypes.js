const router = require('express').Router()
const { NotificationType } = require('../models/DBmodels')

// GET all notification types
router.get('/', async (req, res) => {
  const notificationTypes = await NotificationType.findAll()
  res.json(notificationTypes)
})

// POST new notification type
router.post('/', async (req, res) => {
  const notificationType = await NotificationType.create(req.body)
  res.json(notificationType)
})

// PUT update notification type
router.put('/:id', async (req, res) => {
  const notificationType = await NotificationType.findByPk(req.params.id)
  if (notificationType) {
    await notificationType.update(req.body)
    res.json(notificationType)
  } else {
    res.status(404).json({ error: 'Notification type not found' })
  }
})

// DELETE notification type
router.delete('/:id', async (req, res) => {
  const notificationType = await NotificationType.findByPk(req.params.id)
  if (notificationType) {
    await notificationType.destroy()
    res.status(204).end()
  } else {
    res.status(404).json({ error: 'Notification type not found' })
  }
})

module.exports = router