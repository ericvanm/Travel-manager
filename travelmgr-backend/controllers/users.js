/**
 * Authentication and user profile routes (`/api/auth`).
 *
 * Auth model:
 * - PostgreSQL session cookie (cross-origin with `withCredentials` on the frontend).
 * - JWT stored in `req.session.token`; middleware decodes it into `req.user`.
 *
 * Also handles first-time admin password setup and email password reset tokens.
 */
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const router = require('express').Router()
const { User } = require('../models/DBmodels')
const { requireAuth, buildUserPayload } = require('../utils/auth-helpers')
const { SECRET, ALLOW_REGISTRATION } = require('../utils/config')
const { sendPasswordResetEmail } = require('../utils/email-service')
const { authRateLimit } = require('../utils/auth-rate-limit')

router.use(authRateLimit)

const hashResetToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex')

/**
 * Signs the user in: stores JWT in session and returns the public user payload for the UI.
 *
 * @param {import('express').Request} req
 * @param {import('../models/DBmodels').User} user
 * @returns {ReturnType<import('../utils/auth-helpers').buildUserPayload>}
 */
const signInUser = (req, user) => {
  const userForToken = {
    username: user.username,
    id: user.id,
    role: user.role || 'user'
  }
  const token = jwt.sign(userForToken, SECRET || process.env.SECRET)
  req.session.token = token
  return buildUserPayload(user)
}

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body
    const user = await User.findOne({ where: { username } })

    if (!user || user.disabled) {
      return res.status(401).json({ error: 'invalid_credentials' })
    }

    if (user.mustSetPassword && !user.passwordHash) {
      if (!password) {
        return res.status(403).json({
          error: 'password_setup_required',
          username: user.username,
          id: user.id
        })
      }

      if (String(password).length < 8) {
        return res.status(400).json({ error: 'password_too_short', minLength: 8 })
      }

      const passwordHash = await bcrypt.hash(password, 10)
      await user.update({ passwordHash, mustSetPassword: false })
      return res.json(signInUser(req, user))
    }

    const passwordCorrect = await bcrypt.compare(password || '', user.passwordHash || '')
    if (!passwordCorrect) {
      return res.status(401).json({ error: 'invalid_credentials' })
    }

    res.json(signInUser(req, user))
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

router.post('/setup-initial-password', async (req, res) => {
  try {
    const { username, newPassword } = req.body
    const user = await User.findOne({ where: { username } })

    if (!user || user.disabled || !user.mustSetPassword || user.passwordHash) {
      return res.status(400).json({ error: 'setup_not_allowed' })
    }

    if (!newPassword || String(newPassword).length < 8) {
      return res.status(400).json({ error: 'password_too_short', minLength: 8 })
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)
    await user.update({ passwordHash, mustSetPassword: false })

    res.json(signInUser(req, user))
  } catch (error) {
    console.error('Setup initial password error:', error)
    res.status(500).json({ error: 'password_setup_failed' })
  }
})

// Register
router.post('/register', async (req, res) => {
  try {
    if (!ALLOW_REGISTRATION) {
      return res.status(403).json({ error: 'registration_disabled' })
    }

    const { username, password, name, firstName, lastName, email } = req.body

    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'password_too_short', minLength: 8 })
    }

    const existingUser = await User.findOne({ where: { username } })
    if (existingUser) {
      return res.status(400).json({ error: 'username_exists' })
    }

    const normalizedEmail = email ? String(email).trim().toLowerCase() : null
    const saltRounds = 10
    const passwordHash = await bcrypt.hash(password, saltRounds)

    const user = await User.create({
      username,
      passwordHash,
      name: name || username,
      firstName,
      lastName,
      email: normalizedEmail,
      language: 'en',
      role: 'user',
      mustSetPassword: false
    })

    res.status(201).json(signInUser(req, user))
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'registration_failed' })
  }
})

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    const genericResponse = { message: 'password_reset_requested' }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'email_required' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const user = await User.findOne({
      where: { email: normalizedEmail, disabled: false }
    })

    if (!user || user.role === 'admin' || !user.passwordHash) {
      return res.json(genericResponse)
    }

    const token = crypto.randomBytes(32).toString('hex')
    await user.update({
      passwordResetTokenHash: hashResetToken(token),
      passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000)
    })

    await sendPasswordResetEmail({
      to: user.email,
      username: user.username,
      token,
      language: user.language || 'fr'
    })

    res.json(genericResponse)
  } catch (error) {
    console.error('Forgot password error:', error)
    res.status(500).json({ error: 'password_reset_failed' })
  }
})

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'reset_token_invalid' })
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: 'password_too_short', minLength: 8 })
    }

    const user = await User.findOne({
      where: {
        passwordResetTokenHash: hashResetToken(token),
        disabled: false
      }
    })

    if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      return res.status(400).json({ error: 'reset_token_invalid' })
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)
    await user.update({
      passwordHash,
      mustSetPassword: false,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null
    })

    res.json(signInUser(req, user))
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({ error: 'password_reset_failed' })
  }
})

// Verify token
router.get('/verify', requireAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json(buildUserPayload(user))
  } catch (error) {
    res.status(500).json({ error: 'Verification failed' })
  }
})

// Update profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { firstName, lastName, username, email, language, defaultDepartureLocation } = req.body

    const user = await User.findByPk(req.user.id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (username && username !== user.username) {
      const existingUser = await User.findOne({ where: { username } })
      if (existingUser) {
        return res.status(400).json({ error: 'username_exists' })
      }
    }

    await user.update({
      firstName: firstName || user.firstName,
      lastName: lastName || user.lastName,
      username: username || user.username,
      email: email || user.email,
      language: language || user.language,
      defaultDepartureLocation: defaultDepartureLocation !== undefined
        ? defaultDepartureLocation
        : user.defaultDepartureLocation,
      name: `${firstName || user.firstName || ''} ${lastName || user.lastName || ''}`.trim() || user.username
    })

    res.json(buildUserPayload(user))
  } catch (error) {
    console.error('Profile update error:', error)
    res.status(500).json({ error: 'profile_save_error' })
  }
})

// Change password
router.put('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    const user = await User.findByPk(req.user.id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const passwordCorrect = await bcrypt.compare(currentPassword, user.passwordHash || '')
    if (!passwordCorrect) {
      return res.status(400).json({ error: 'current_password_incorrect' })
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'password_too_short', minLength: 8 })
    }

    const saltRounds = 10
    const passwordHash = await bcrypt.hash(newPassword, saltRounds)

    await user.update({ passwordHash, mustSetPassword: false })

    res.json({ message: 'Password changed successfully' })
  } catch (error) {
    console.error('Password change error:', error)
    res.status(500).json({ error: 'password_change_error' })
  }
})

// List all profiles (admin only)
router.get('/profiles', requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const users = await User.findAll({
      attributes: ['id', 'username', 'name', 'firstName', 'lastName', 'email', 'language', 'role']
    })
    res.json(users)
  } catch (error) {
    console.error('Failed to fetch profiles:', error)
    res.status(500).json({ error: 'Failed to fetch profiles' })
  }
})

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy()
  res.json({ message: 'Logged out successfully' })
})

module.exports = router
