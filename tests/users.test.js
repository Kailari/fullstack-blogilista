const supertest = require('supertest')
const mongoose = require('mongoose')
const app = require('../app')
const api = supertest(app)
const bcrypt = require('bcrypt')
const { initialUsers, usersInDb } = require('./test_helper')

const User = require('../models/user')

beforeAll(async () => {
  for (let user of initialUsers) {
    const saltRounds = 5 // these are for tests, compromise security for speed
    user.passwordHash = await bcrypt.hash(user.password, saltRounds)
  }
})

beforeEach(async () => {
  await User.deleteMany({})

  for (let user of initialUsers) {
    let userObj = new User(user)
    await userObj.save()
  }
})

afterAll(() => {
  mongoose.connection.close()
})


describe('HTTP GET /api/users', async () => {
  test('correct number of users is returned', async () => {
    const response = await api.get('/api/users')
    expect(response.body.length).toBe(initialUsers.length)
  })
})

describe('HTTP POST /api/users', async () => {
  test('trying to use taken username fails', async () => {
    const newUser = {
      username: 'root',
      password: 'abc123'
    }

    const response = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toContain('expected `username` to be unique')

    const numAtEnd = (await usersInDb()).length
    expect(numAtEnd).toBe(initialUsers.length)
  })

  test('valid request adds a new user to the database', async () => {
    const newUser = {
      username: 'test',
      password: 'abc123',
      name: 'Testi Henkilö'
    }

    const response = await api
      .post('/api/users')
      .send(newUser)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    delete newUser.password
    expect(response.body).toMatchObject(newUser)
    expect(await User.findById(response.body.id)).toMatchObject(newUser)

    const numAtEnd = (await usersInDb()).length
    expect(numAtEnd).toBe(initialUsers.length + 1)
  })

  test('shorter than 3 character password is rejected', async () => {
    const newUser = {
      username: 'test',
      password: 'p'
    }

    const response = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toContain('password too short')

    const numAtEnd = (await usersInDb()).length
    expect(numAtEnd).toBe(initialUsers.length)
  })


  test('shorter than 3 character username is rejected', async () => {
    const newUser = {
      username: 't',
      password: 'password'
    }

    const response = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toContain('`username`')
    expect(response.body.error).toContain('is shorter than the minimum allowed length')

    const numAtEnd = (await usersInDb()).length
    expect(numAtEnd).toBe(initialUsers.length)
  })

  test('request with password missing is rejected', async () => {
    const newUser = {
      username: 'testi'
    }

    const response = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toContain('`password` is required')

    const numAtEnd = (await usersInDb()).length
    expect(numAtEnd).toBe(initialUsers.length)
  })

  test('request with username missing is rejected', async () => {
    const newUser = {
      password: 'password'
    }

    const response = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toContain('`username` is required')

    const numAtEnd = (await usersInDb()).length
    expect(numAtEnd).toBe(initialUsers.length)
  })
})
