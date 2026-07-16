const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const router = require('express').Router()
const { User } = require('../models/DBmodels')
const { requireAuth, buildUserPayload } = require('../utils/auth-helpers')
const { SECRET } = require('../utils/config')

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
      return res.status(401).json({ error: 'Invalid username or password' })
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
      return res.status(401).json({ error: 'Invalid username or password' })
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
    const { username, password, name, firstName, lastName, email } = req.body

    if (!password || password.length < 3) {
      return res.status(400).json({ error: 'Password must be at least 3 characters long' })
    }

    const existingUser = await User.findOne({ where: { username } })
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' })
    }

    const saltRounds = 10
    const passwordHash = await bcrypt.hash(password, saltRounds)

    const user = await User.create({
      username,
      passwordHash,
      name: name || username,
      firstName,
      lastName,
      email,
      language: 'en',
      role: 'user',
      mustSetPassword: false
    })

    res.status(201).json(buildUserPayload(user))
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Registration failed' })
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

    if (!newPassword || newPassword.length < 3) {
      return res.status(400).json({ error: 'new_password_invalid' })
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
