const router = require('express').Router()
const {
  User,
  AiInteractionLog
} = require('../models/DBmodels')
const { requireAuth, requireAdmin } = require('../utils/auth-helpers')
const { findTripsForAdmin, parseUserId } = require('../utils/trip-ownership')

router.use(requireAuth)
router.use(requireAdmin)

router.get('/users', async (_req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'name', 'role'],
      order: [['username', 'ASC']]
    })
    res.json(users)
  } catch (error) {
    console.error('Admin users list error:', error)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

router.get('/trips', async (req, res) => {
  try {
    const userId = req.query.userId !== undefined && req.query.userId !== null && req.query.userId !== ''
      ? parseUserId(req.query.userId)
      : null

    if (req.query.userId && !userId) {
      return res.status(400).json({ error: 'Invalid userId' })
    }

    const trips = await findTripsForAdmin(userId)
    res.json(trips)
  } catch (error) {
    console.error('Admin trips list error:', error)
    res.status(500).json({ error: 'Failed to fetch trips' })
  }
})

router.get('/ai-logs', async (req, res) => {
  try {
    const where = {}
    const limit = Math.min(Number(req.query.limit) || 50, 200)
    const offset = Number(req.query.offset) || 0

    if (req.query.userId) where.userId = Number(req.query.userId)
    if (req.query.feature) where.feature = String(req.query.feature)
    if (req.query.operation) where.operation = String(req.query.operation)
    if (req.query.sessionId) where.sessionId = Number(req.query.sessionId)
    if (req.query.tripId) where.tripId = Number(req.query.tripId)
    if (req.query.status) where.status = String(req.query.status)

    const { rows, count } = await AiInteractionLog.findAndCountAll({
      where,
      include: [{
        model: User,
        attributes: ['id', 'username', 'name'],
        required: false
      }],
      attributes: {
        exclude: ['systemPrompt', 'userPrompt', 'requestMessages', 'rawResponse', 'parsedResponse']
      },
      order: [['createdAt', 'DESC']],
      limit,
      offset
    })

    res.json({ logs: rows, total: count, limit, offset })
  } catch (error) {
    console.error('Admin AI logs list error:', error)
    res.status(500).json({ error: 'Failed to fetch AI logs' })
  }
})

router.get('/ai-logs/:id', async (req, res) => {
  try {
    const log = await AiInteractionLog.findByPk(req.params.id, {
      include: [{
        model: User,
        attributes: ['id', 'username', 'name'],
        required: false
      }]
    })

    if (!log) {
      return res.status(404).json({ error: 'Log not found' })
    }

    const plain = log.get({ plain: true })
    if (plain.parsedResponse === undefined) plain.parsedResponse = null
    if (plain.requestPayload === undefined) plain.requestPayload = null
    if (typeof plain.requestPayload === 'string') {
      try {
        plain.requestPayload = JSON.parse(plain.requestPayload)
      } catch {
        plain.requestPayload = { raw: plain.requestPayload }
      }
    }
    if (typeof plain.parsedResponse === 'string') {
      try {
        plain.parsedResponse = JSON.parse(plain.parsedResponse)
      } catch {
        plain.parsedResponse = { raw: plain.parsedResponse }
      }
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.status(200).send(JSON.stringify(plain))
  } catch (error) {
    console.error('Admin AI log detail error:', error)
    res.status(500).json({ error: 'Failed to fetch AI log' })
  }
})

module.exports = router
