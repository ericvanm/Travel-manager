const { test, describe } = require('node:test')
const assert = require('node:assert')
const { dummy, totalLikes, favoriteBlog, mostBlogs, mostLikes } = require('../utils/list_helper')

const blogs = [
  { author: 'Alice', title: 'A', likes: 3 },
  { author: 'Bob', title: 'B', likes: 7 },
  { author: 'Alice', title: 'C', likes: 2 },
  { author: 'Bob', title: 'D', likes: 1 },
]

describe('list_helper', () => {
  test('dummy returns 1', () => {
    assert.strictEqual(dummy([]), 1)
  })

  test('totalLikes sums blog likes', () => {
    assert.strictEqual(totalLikes(blogs), 13)
  })

  test('favoriteBlog returns highest liked blog', () => {
    assert.strictEqual(favoriteBlog(blogs).title, 'B')
  })

  test('mostBlogs returns author with most posts', () => {
    assert.deepStrictEqual(mostBlogs(blogs), { author: 'Alice', blogs: 2 })
  })

  test('mostLikes returns author with most total likes', () => {
    assert.deepStrictEqual(mostLikes(blogs), { author: 'Bob', likes: 8 })
  })
})
