const router = require('express').Router()
const Blog = require('../models/blogs')
const User = require('../models/user')

router.post('/reset', async (request, response, next) => {
  console.log("/reset called")
  await Blog.deleteMany({})
  await User.deleteMany({})

  response.status(204).end()
})

module.exports = router