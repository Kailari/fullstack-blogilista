const jwt = require('jsonwebtoken')

const blogsRouter = require('express').Router()
const Blog = require('../models/blog')
const User = require('../models/user')

blogsRouter.get('/', async (request, response) => {
  try {
    const blogs = await Blog
      .find({})
      .populate('user', { username: 1, name: 1 })

    return response.json(blogs)
  } catch (error) {
    return response.status(500).end()
  }
})

blogsRouter.post('/', async (request, response) => {
  try {
    const decodedToken = jwt.verify(request.token, process.env.SECRET)
    if (!request.token || !decodedToken.id) {
      return response.status(401).json({ error: 'token missing or invalid' })
    }

    const user = await User.findById(decodedToken.id)

    const newBlog = request.body
    newBlog.likes = newBlog.likes || 0
    newBlog.author = newBlog.author === undefined ? 'unknown' : newBlog.author
    newBlog.user = user._id

    const blogObj = new Blog(newBlog)

    const savedBlog = await blogObj.save()
    user.blogs = user.blogs.concat(savedBlog._id)
    await user.save()
    return response.status(201).json(savedBlog.toJSON())
  }
  catch (error) {
    return response.status(400).json({ error: error.message })
  }
})

blogsRouter.delete('/:id', async (request, response) => {
  try {
    await Blog.findByIdAndRemove(request.params.id)
    response.status(204).end()
  } catch (error) {
    response.status(404).end()
  }
})

blogsRouter.put('/:id', async (request, response) => {
  const blog = request.body

  try {
    const updatedBlog = await Blog.findByIdAndUpdate(request.params.id, blog, { new: true })
    return response.json(updatedBlog.toJSON())
  } catch (error) {
    return response.status(404).end()
  }
})

module.exports = blogsRouter
