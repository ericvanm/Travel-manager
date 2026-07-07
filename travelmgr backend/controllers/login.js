const bcrypt = require('bcryptjs')
const loginRouter = require('express').Router()
const { User } = require('../models/DBmodels')

loginRouter.post('/', async (request, response) => {
  const { username, password } = request.body
  const user = await User.findOne({ where: { username } })
  const passwordCorrect =
    user === null ? false : await bcrypt.compare(password, user.passwordHash)

  if (!(user && passwordCorrect)) {
    return response.status(401).json({
      error: 'invalid username or password',
    })
  }

  if (user.disabled) {
    return response.status(401).json({
      error: 'login failed: user is disabled',
    })
  }

  const userForToken = {
    username: user.username,
    name: user.name,
    id: user.id,
  }
  request.session.isLoggedIn = true
  request.session.user = userForToken

  response
    .status(200)
    .send({ id: user.id, username: user.username, name: user.name, email: user.email })
})

module.exports = loginRouter
