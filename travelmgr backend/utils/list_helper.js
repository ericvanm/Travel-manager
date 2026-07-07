
// eslint-disable-next-line no-unused-vars
const dummy = (blogs) => {
    // ...
    return 1
  }

const totalLikes = (blogs) => {
    // compute the total of likes for the blogs in the array
    let totalLikes = 0
    blogs.map(blog => totalLikes += blog.likes)
    return totalLikes
  }

const favoriteBlog  = (blogs) => {
    // compute the total of likes for the blogs in the array
    let favoriteBlog = null
    let favoriteLikes = 0
    blogs.map(blog => {if (blog.likes>favoriteLikes) {
      favoriteBlog = blog
      favoriteLikes = blog.likes
    }})
    return favoriteBlog
  }

const mostBlogs   = (blogs) => {
    // function returns the author who has the largest amount of blogs.
    // The return value also contains the number of blogs the top author has:
    let authorBlog = []
    let mostBlogs = { author: "", blogs: 0 }
    blogs.map(blog => {
      // eslint-disable-next-line eqeqeq
      //console.log('authorBlog',authorBlog )
      const indexAuthor = authorBlog.findIndex((x) => x.author == blog.author)
      //console.log('indexAuthor',indexAuthor )
      if (indexAuthor < 0) {
        //console.log('concat', { author: blog.author, blogs: 1 } )
        authorBlog.push({ author: blog.author, blogs: 1 })
        if (mostBlogs.blogs < 1) {
          mostBlogs = { author: blog.author, blogs: 1 }
        }
      }else {
        const nbBlogs = Number.parseInt(authorBlog[indexAuthor].blogs, 10) + 1
        //console.log('nbBlogs',nbBlogs, authorBlog[indexAuthor].blogs )
        authorBlog[indexAuthor] = { author: blog.author, blogs: nbBlogs }
        if (nbBlogs > mostBlogs.blogs) {
          mostBlogs = authorBlog[indexAuthor]
        }
      }
    })
    //console.log('most author', mostBlogs)
    return mostBlogs
  }

const mostLikes     = (blogs) => {
  // function returns the author who has the largest amount of lokes.
  // The return value also contains the total of likes the top author has:
  let authorBlog = []
  let mostLikes = { author: "", likes: 0 }
  blogs.map(blog => {
    // eslint-disable-next-line eqeqeq
    //console.log('authorBlog',authorBlog )
    const indexAuthor = authorBlog.findIndex((x) => x.author == blog.author)
    //console.log('indexAuthor',indexAuthor )
    if (indexAuthor < 0) {
      //console.log('concat', { author: blog.author, blogs: 1 } )
      authorBlog.push({ author: blog.author, likes: blog.likes })
      if (mostLikes.likes < blog.likes) {
        mostLikes = { author: blog.author, likes: blog.likes }
      }
    }else {
      const nbLikes = Number.parseInt(authorBlog[indexAuthor].likes, 10) + blog.likes
      //console.log('nbBlogs',nbBlogs, authorBlog[indexAuthor].blogs )
      authorBlog[indexAuthor] = { author: blog.author, likes: nbLikes }
      if (nbLikes > mostLikes.likes) {
        mostLikes = authorBlog[indexAuthor]
      }
    }
  })
  console.log('most author likes', mostLikes)
  return mostLikes
}

module.exports = {
    dummy, totalLikes, favoriteBlog, mostBlogs, mostLikes
  }