const { test, after, before, beforeEach, describe } = require('node:test')
const bcrypt = require('bcrypt')
const mongoose = require('mongoose')
const assert = require('node:assert')
const supertest = require('supertest')
const helper = require('./test_helper')
const app = require('../app')

const api = supertest(app)

const Blog = require('../models/blogs')
const User = require('../models/user')

let token = null // token returned by the login init
let token2 = null // token returned by the login user init2
let blogId1 = null // to collect the ID of the first created Blog
let blogId2 = null // to collect the ID of the second created Blog



beforeEach(async () => {
   /*let blogObject = new Blog(helper.initialBlogs[0])
    await blogObject.save()

    blogObject = new Blog(helper.initialBlogs[1])
    await blogObject.save()*/
    //console.log("beforeEach")
  })

before(async () => {


  await User.deleteMany({})
  await User.find({})

  // create user "init"
  const newUser = {
    username: "init",
    password: "sekret"
  }
  const passwordHash = await bcrypt.hash('sekret', 10)
  const user = new User({ username: 'init', passwordHash })

  await user.save()

    // create user "init2"
  const newUser2 = {
    username: "init2",
    password: "sekret"
  }
  const passwordHash2 = await bcrypt.hash('sekret', 10)
  const user2 = new User({ username: 'init2', passwordHash: passwordHash2 })

  await user2.save()

  // get login tokens for the both users
  const request = await api
    .post('/api/login')
    .send(newUser)
    console.log("login request body", request.body)
    token = request.body.token
    console.log("login token", token)

  const request2 = await api
    .post('/api/login')
    .send(newUser2)
    console.log("login request body", request2.body)
    token2 = request2.body.token
    console.log("login token", token2)


    await Blog.deleteMany({})
})

// test suite to add a new blog
describe('verify POST /api/blogs', () => {
  test('New blog is posted ', async () => {

    await api
      .post('/api/blogs')
      .send(helper.initialBlogs[2])
      .set({ Authorization: `Bearer ${token}` })
      .expect(201)
      .expect('Content-Type', /application\/json/)
      //console.log("test: ", response.body)
      const blogsAtEnd = await helper.blogsInDb()
      assert.strictEqual(blogsAtEnd.length, 1)  // check that just 3 blogs returned
  })

  test('New blog without like is posted, like must be set to 0 ', async () => {

    await api
      .post('/api/blogs')
      .set({ Authorization: `Bearer ${token}` })
      .send(helper.missingLikeBlogs[0])
      .expect(201)
      .expect('Content-Type', /application\/json/)
      //console.log("test: ", response.body)

      const blogsAtEnd = await helper.blogsInDb()
      //console.log("list of blogs",blogsAtEnd )
      const createdBlog = blogsAtEnd.find( (blog) => blog.title === helper.missingLikeBlogs[0].title)
      //console.log("last added blog",createdBlog )
      const likes = createdBlog.likes
      assert.strictEqual(likes, 0)  // check that the missing like at the blog creation is converted to '0'
  })

  test('New blog without title is rejected ', async () => {

    await api
      .post('/api/blogs')
      .set({ Authorization: `Bearer ${token}` })
      .send(helper.missingTitleBlogs[0])
      .expect(400)
      .expect('Content-Type', /application\/json/)
      //console.log("test: ", response.body)
  })

  test('New blog without url is rejected ', async () => {

    await api
      .post('/api/blogs')
      .set({ Authorization: `Bearer ${token}` })
      .send(helper.missingUrlBlogs[0])
      .expect(400)
      .expect('Content-Type', /application\/json/)
      //console.log("test: ", response.body)
  })

  test('New blog without token is rejected ', async () => {

    await api
      .post('/api/blogs')
      .send(helper.initialBlogs[2])
      .expect(401)
      .expect('Content-Type', /application\/json/)
      //console.log("test: ", response.body)
  })

  })
  // test suite to get blog list
describe('verify GET /api/blogs', () => {
test('blogs are returned as json', async () => {
  const response = await api
    .get('/api/blogs')
    .expect(200)
    .expect('Content-Type', /application\/json/)
    //console.log("test: ", response.body)
    assert.strictEqual(response.body.length,2)  // check that only 2 blogs returned
})

test('blogs returns id instead of _id', async () => {
    const response = await api
      .get('/api/blogs')
      .expect(200)
      .expect('Content-Type', /application\/json/)
      //console.log("test: ", Object.keys(response.body[0]))
      blogId1 = response.body[0].id
      blogId2 = response.body[1].id

      assert.ok(Object.keys(response.body[0]).find((k) => k === "id"))  // check that there is a property "id"
      assert.ok(!(Object.keys(response.body[0]).find((k) => k === "_id")))  // check that there is no property "_id"
  })

  test('all blogs are returned', async () => {
    const response = await api
    .get('/api/blogs')
     assert.strictEqual(response.body.length, 2)})

})

  // Test suite concerning the deletion of blogs
  describe('delete a blog', async () => {
    test('A blog is deleted ', async () => {
      const ID = blogId1
      await api
        .delete(`/api/blogs/${ID}`)
        .set({ Authorization: `Bearer ${token}` })
        .expect(204)

    })

    test('An unknown blog is deleted ', async () => {
      const ID = blogId1
      console.log("ID", ID)
      await api
        .delete(`/api/blogs/${ID}`)
        .set({ Authorization: `Bearer ${token}` })
        .expect(404)

    })

    test('A blog already deleted return 404', async () => {
      const ID = blogId1
      await api
        .delete(`/api/blogs/${ID}`)
        .set({ Authorization: `Bearer ${token}` })
        .expect(404)

    })

    test('A blog is not deleted if not the creator', async () => {
      const ID = blogId2
      await api
        .delete(`/api/blogs/${ID}`)
        .set({ Authorization: `Bearer ${token2}` })
        .expect(403)

    })
    test('A blog is not deleted if no token', async () => {
      const ID = blogId2
      await api
        .delete(`/api/blogs/${ID}`)
        .expect(401)

    })
  })

// test suite to get a given blog via ID
describe('verify GET /api/blogs/:id', async () => {

  test('succeeds with a valid id ', async () => {
      const ID = blogId2
      const response = await api
        .get(`/api/blogs/${ID}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)
        //console.log("test: ", Object.keys(response.body[0]))
        assert.strictEqual(ID, response.body.id)  // check that there is no property "_id"
    })

  test('fails with statuscode 404 if blog does not exist ', async () => {
      const validNonexistingId = await helper.nonExistingId()
      await api.get(`/api/blogs/${validNonexistingId}`) // use a non existent ID in the test data
       .expect(404)

  })

  test('fails with statuscode 400 id is invalid', async () => {
    const invalidId = '5a3d5da59070081a82a3445'

    await api
      .get(`/api/blogs/${invalidId}`)
      .expect(400)
  })


})



// test suite to get a given blog via ID
describe('verify PUT /api/blogs/:id', () => {

  test('succeeds with a valid id ', async () => {
      const ID = blogId2
      const blog = helper.initialBlogs[0]
      const likes = (helper.initialBlogs[0].likes) +1
      blog.likes = likes
      await api
        .put(`/api/blogs/${ID}`)
        .set({ Authorization: `Bearer ${token}` })
        .send(blog)
        .expect(200)
        .expect('Content-Type', /application\/json/)
        //console.log("test: ", Object.keys(response.body[0]))
        //assert.strictEqual(ID, response.body.id)  // check that there is no property "_id"

      const response = await api
        .get(`/api/blogs/${ID}`)
        .set({ Authorization: `Bearer ${token}` })
        .expect(200)
        .expect('Content-Type', /application\/json/)
        //console.log("test: ", Object.keys(response.body[0]))
        assert.strictEqual( likes, response.body.likes)  // check that the likes is incremented
    })



  test('fails with statuscode 404 if blog does not exist ', async () => {
      const validNonexistingId = await helper.nonExistingId()
      const blog = helper.initialBlogs[0]
      await api
      .put(`/api/blogs/${validNonexistingId}`) // use a non existent ID in the test data
      .set({ Authorization: `Bearer ${token}` })
      .send(blog)
      .expect(404)

  })

  test('fails with statuscode 400 id is invalid', async () => {
    const invalidId = '5a3d5da59070081a82a3445'
    const blog = helper.initialBlogs[0]
    await api
      .put(`/api/blogs/${invalidId}`)
      .set({ Authorization: `Bearer ${token}` })
      .send(blog)
      .expect(400)
  })

  test('fails with statuscode 401 no token', async () => {
    const invalidId = '5a3d5da59070081a82a3445'
    const blog = helper.initialBlogs[0]
    await api
      .put(`/api/blogs/${invalidId}`)
      .send(blog)
      .expect(401)
  })

})


after(async () => {
  await mongoose.connection.close()
  //console.log("after")
})