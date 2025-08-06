const bcrypt = require('bcrypt')
const usersRouter = require('express').Router()
const {User, Blog, Readinglist} = require('../models/DBmodels')

usersRouter.get('/', async (request, response, next) => {
  try {
    const users = await User.findAll({ include: { model: Blog }})
     response.json(users)
    } catch(exception) {
      next(exception)
    }
})

usersRouter.get("/:id", async (request, response, next) => {
  try {
   const where = {}
    if (request.query.read) {
      where.isRead = request.query.read === 'true'
    }

    const user = await User.findByPk(request.params.id, { 
      attributes: ['name', 'username', 'disabled'], 
      include: [ 
        { 
          model: Blog,
          attributes: ['id', 'url', 'title', 'author', 'likes', 'year'],
          through: {
            attributes: ['isRead' , 'id'], // no fields of the readlinst entry
            where
          },
          }
      ]
    });
    
    if (user) {
      response.json(user);
    } else {
      response.status(404).end();
    }
  } catch (exception) {
    next(exception);
  }
});


usersRouter.post('/', async (request, response, next) => {
  try {
      const { username, name, password } = request.body

      if (!password){
        return response.status(400).json({
          error:'mandatory `password` is missing'
      })
      }
      if (password.length < 3){
        return response.status(400).json({
          error:'Invalid length of `password`'
      })
      }
      if (username) {
        const users = await User.findAll({ where: {username: username }})
        if (users.length > 0) {
          response.status(400).json('expected `username` to be unique')
        }
      }

      const saltRounds = 10
      const passwordHash = await bcrypt.hash(password, saltRounds)

      const user = await User.create({
        username,
        name,
        passwordHash,
      })

      
      response.status(201).json(user)
  } catch(exception) {
    next(exception)
  }

})

usersRouter.put('/:username', async (request, response, next) => {
  try {
      const { username, name, password, disabled } = request.body

      // a new password must repesct the rule of min 3 chars length
      if ( password && password.length < 3){
        return response.status(400).json({
          error:'Invalid length of `password`'
      })
      }

      // check that the new username is unique only if new username is different from the one of the params
      if (username && (username !== request.params.username)) {
        const users = await User.findAll({ where: {username: username }})
        if (users.length > 0) {
          response.status(400).json('expected `username` to be unique')
        }
      }

      // retrieve the user to be modified based on request param
      const user = await User.findOne({ where: {username: request.params.username }})
      if (!user) {
        return response.status(404).json('user not found')
      }

       // set new password if set in the request
      if (password) {
        const saltRounds = 10
        const passwordHash = await bcrypt.hash(password, saltRounds)
        user.passwordHash = passwordHash
      }
     
      // set only name if changed
      if (name) {
        user.name = name
      }

      // set only username if changed
      if (username) {
        user.username = username
      }

      user.disabled = disabled

      await user.save()
      response.json(user)
  } catch(exception) {
    next(exception)
  }

})

module.exports = usersRouter