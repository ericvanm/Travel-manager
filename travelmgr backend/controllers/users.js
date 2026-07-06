const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const router = require('express').Router()
const { User } = require('../models/DBmodels')

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  // Support session-based auth (login.js sets isLoggedIn)
  if (req.session && req.session.isLoggedIn && req.session.user) {
    req.user = req.session.user  // { id, username, name }
    return next()
  }
  // Support JWT token in session (users.js login sets token)
  const token = req.session && req.session.token
  if (!token) {
    return res.status(401).json({ error: 'Access denied' })
  }
  try {
    const decoded = jwt.verify(token, process.env.SECRET)
    req.user = decoded
    next()
  } catch (error) {
    res.status(400).json({ error: 'Invalid token' })
  }
}

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body
    
    const user = await User.findOne({ where: { username } })
    const passwordCorrect = user === null
      ? false
      : await bcrypt.compare(password, user.passwordHash)
    
    if (!(user && passwordCorrect)) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }
    
    const userForToken = {
      username: user.username,
      id: user.id,
    }
    
    const token = jwt.sign(userForToken, process.env.SECRET)
    
    req.session.token = token
    
    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      language: user.language || 'en'
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
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
      language: 'en'
    })
    
    res.status(201).json({
      id: user.id,
      username: user.username,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      language: user.language
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Registration failed' })
  }
})

// Verify token
router.get('/verify', verifyToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    
    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      language: user.language || 'en'
    })
  } catch (error) {
    res.status(500).json({ error: 'Verification failed' })
  }
})

// Update profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { firstName, lastName, username, email, language } = req.body
    
    const user = await User.findByPk(req.user.id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    
    // Check username uniqueness if changed
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
      name: `${firstName || user.firstName || ''} ${lastName || user.lastName || ''}`.trim() || user.username
    })
    
    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      language: user.language
    })
  } catch (error) {
    console.error('Profile update error:', error)
    res.status(500).json({ error: 'profile_save_error' })
  }
})

// Change password
router.put('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    
    const user = await User.findByPk(req.user.id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    
    const passwordCorrect = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!passwordCorrect) {
      return res.status(400).json({ error: 'current_password_incorrect' })
    }
    
    if (!newPassword || newPassword.length < 3) {
      return res.status(400).json({ error: 'new_password_invalid' })
    }
    
    const saltRounds = 10
    const passwordHash = await bcrypt.hash(newPassword, saltRounds)
    
    await user.update({ passwordHash })
    
    res.json({ message: 'Password changed successfully' })
  } catch (error) {
    console.error('Password change error:', error)
    res.status(500).json({ error: 'password_change_error' })
  }
})

// List all profiles
router.get('/profiles', async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'name', 'firstName', 'lastName', 'email', 'language']
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