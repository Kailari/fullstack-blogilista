const bcrypt = require('bcrypt')
const usersRouter = require('express').Router()
const User = require('../models/user')

usersRouter.get('/', async (request, response, next) => {
  try {
    const users = await User
      .find({})
      .populate('blogs', { user: 0 })

    return response.json(users)
  } catch (error) {
    return next(error)
  }
})

usersRouter.post('/', async (request, response, next) => {
  const body = request.body

  if (body.password === undefined) {
    return response.status(400).json({ error: '`password` is required' })
  } else if (body.password.length < 3) {
    return response.status(400).json({ error: 'password too short' })
  }

  try {

    const saltRounds = 10
    const passwordHash = await bcrypt.hash(body.password, saltRounds)

    const user = new User({
      username: body.username,
      name: body.name,
      passwordHash
    })

    const savedUser = await user.save()

    return response.status(201).json(savedUser)
  } catch (error) {
    return next(error)
  }
})

module.exports = usersRouter
