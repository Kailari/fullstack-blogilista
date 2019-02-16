const Blog = require('../models/blog')

const dummy = (blogs) => {
  return 1
}

const totalLikes = (blogs) => {
  return (blogs && blogs.length > 0)
    ? blogs.map(b => b.likes).reduce((a, b) => a + b)
    : 0
}

const favoriteBlog = (blogs) => {
  if (blogs && blogs.length > 0) {
    const likes = blogs.map(b => b.likes)
    return blogs[likes.indexOf(Math.max(...likes))]
  } else {
    return null
  }
}

module.exports = {
  dummy,
  totalLikes,
  favoriteBlog,
}
