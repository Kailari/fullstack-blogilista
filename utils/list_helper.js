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

const mostBlogs = (blogs) => {
  if (!blogs || blogs.length === 0) {
    return null
  }

  const counts = blogs.reduce((result, blog) => {
    return result.set(blog.author, (result.get(blog.author) || 0) + 1)
  }, new Map())

  const result = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])[0]

  return {
    author: result[0],
    blogs: result[1]
  }
}

const mostLikes = (blogs) => {
  if (!blogs || blogs.length === 0) {
    return null
  }

  const counts = blogs.reduce((result, blog) => {
    return result.set(blog.author, (result.get(blog.author) || 0) + blog.likes)
  }, new Map())

  const result = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])[0]

  // Technically we could .map before sort to make code more readable, but that
  // would introduce an additional iteration over the result set, so don't break
  // down the key-value-pair(s) until here
  return {
    author: result[0],
    likes: result[1]
  }
}

module.exports = {
  dummy,
  totalLikes,
  favoriteBlog,
  mostBlogs,
  mostLikes,
}
