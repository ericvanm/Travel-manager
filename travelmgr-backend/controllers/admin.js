/**
 * Admin API: read-only trip overview (unified ownership) and AI interaction audit.
 *
 * All routes require login + admin role (JWT role from session, not a live DB role check).
 * List endpoints omit full prompts; only `GET /ai-logs/:id` returns complete LLM payloads.
 */
const router = require('express').Router()
const bcrypt = require('bcryptjs')
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
      attributes: [
        'id', 'username', 'name', 'firstName', 'lastName', 'email', 'role',
        'readOnly', 'disabled', 'allowPasswordReset'
      ],
      order: [['username', 'ASC']]
    })
    res.json(users)
  } catch (error) {
    console.error('Admin users list error:', error)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

const buildDisplayName = (firstName, lastName, username) => {
  const combined = `${firstName || ''} ${lastName || ''}`.trim()
  return combined || username
}

router.post('/users', async (req, res) => {
  try {
    const {
      username,
      password,
      firstName,
      lastName,
      email,
      readOnly = false,
      role = 'user'
    } = req.body

    if (!username || !password || String(password).length < 8) {
      return res.status(400).json({ error: 'password_too_short', minLength: 8 })
    }

    if (role !== 'user' && role !== 'admin') {
      return res.status(400).json({ error: 'invalid_role' })
    }

    const existing = await User.findOne({ where: { username } })
    if (existing) {
      return res.status(400).json({ error: 'username_exists' })
    }

    const normalizedEmail = email ? String(email).trim().toLowerCase() : null
    const passwordHash = await bcrypt.hash(password, 10)
    const user = await User.create({
      username,
      passwordHash,
      firstName: firstName || null,
      lastName: lastName || null,
      name: buildDisplayName(firstName, lastName, username),
      email: normalizedEmail,
      role,
      readOnly: Boolean(readOnly),
      allowPasswordReset: true,
      mustSetPassword: false,
      disabled: false,
      language: 'en'
    })

    res.status(201).json(user)
  } catch (error) {
    console.error('Admin create user error:', error)
    res.status(500).json({ error: 'Failed to create user' })
  }
})

router.put('/users/:id', async (req, res) => {
  try {
    const userId = parseUserId(req.params.id)
    if (!userId) {
      return res.status(400).json({ error: 'Invalid user id' })
    }

    const user = await User.findByPk(userId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const {
      firstName,
      lastName,
      email,
      readOnly,
      disabled,
      role
    } = req.body

    if (role !== undefined && role !== 'user' && role !== 'admin') {
      return res.status(400).json({ error: 'invalid_role' })
    }

    if (user.role === 'admin' && role === 'user') {
      const adminCount = await User.count({ where: { role: 'admin', disabled: false } })
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'last_admin_cannot_demote' })
      }
    }

    if (userId === req.user.id) {
      if (readOnly === true) {
        return res.status(400).json({ error: 'cannot_self_read_only' })
      }
      if (disabled === true) {
        return res.status(400).json({ error: 'cannot_self_disable' })
      }
    }

    const updates = {}
    if (firstName !== undefined) updates.firstName = firstName || null
    if (lastName !== undefined) updates.lastName = lastName || null
    if (email !== undefined) updates.email = email ? String(email).trim().toLowerCase() : null
    if (readOnly !== undefined) updates.readOnly = Boolean(readOnly)
    if (disabled !== undefined) updates.disabled = Boolean(disabled)
    if (role !== undefined) updates.role = role

    if (updates.firstName !== undefined || updates.lastName !== undefined) {
      updates.name = buildDisplayName(
        updates.firstName !== undefined ? updates.firstName : user.firstName,
        updates.lastName !== undefined ? updates.lastName : user.lastName,
        user.username
      )
    }

    if (user.username === 'demo') {
      updates.allowPasswordReset = false
    }

    await user.update(updates)
    res.json(user)
  } catch (error) {
    console.error('Admin update user error:', error)
    res.status(500).json({ error: 'Failed to update user' })
  }
})

router.put('/users/:id/password', async (req, res) => {
  try {
    const userId = parseUserId(req.params.id)
    if (!userId) {
      return res.status(400).json({ error: 'Invalid user id' })
    }

    const { newPassword } = req.body
    if (!newPassword || String(newPassword).length < 8) {
      return res.status(400).json({ error: 'password_too_short', minLength: 8 })
    }

    const user = await User.findByPk(userId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)
    await user.update({
      passwordHash,
      mustSetPassword: false,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null
    })

    res.json({ message: 'password_updated' })
  } catch (error) {
    console.error('Admin set password error:', error)
    res.status(500).json({ error: 'Failed to update password' })
  }
})

router.delete('/users/:id', async (req, res) => {
  try {
    const userId = parseUserId(req.params.id)
    if (!userId) {
      return res.status(400).json({ error: 'Invalid user id' })
    }

    if (userId === req.user.id) {
      return res.status(400).json({ error: 'cannot_delete_self' })
    }

    const user = await User.findByPk(userId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (user.role === 'admin') {
      return res.status(400).json({ error: 'cannot_delete_admin_user' })
    }

    await user.destroy()
    res.status(204).send()
  } catch (error) {
    console.error('Admin delete user error:', error)
    res.status(500).json({ error: 'Failed to delete user' })
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

    if (req.query.userId !== undefined && req.query.userId !== null && req.query.userId !== '') {
      const filterUserId = parseUserId(req.query.userId)
      if (!filterUserId) {
        return res.status(400).json({ error: 'Invalid userId' })
      }
      where.userId = filterUserId
    }
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
