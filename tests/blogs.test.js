const supertest = require('supertest')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const app = require('../app')
const api = supertest(app)
const { initialUsers, initialBlogs, blogsInDb, blogIdNotFound } = require('./test_helper')

const Blog = require('../models/blog')
const User = require('../models/user')

beforeEach(async () => {
  await Blog.deleteMany({})
  await User.deleteMany({})

  for (let user of initialUsers) {
    const saltRounds = 5 // these are for tests, compromise security for speed
    user.passwordHash = await bcrypt.hash(user.password, saltRounds)
    let userObj = new User(user)
    await userObj.save()
  }

  const user = await User.findOne()

  for (let blog of initialBlogs) {
    blog.user = user._id
    let blogObj = new Blog(blog)
    await blogObj.save()
  }
})

afterAll(() => {
  mongoose.connection.close()
})

describe('HTTP GET /api/blogs', () => {
  test('correct number of notes is returned', async () => {
    const response = await api.get('/api/blogs')

    expect(response.body.length).toBe(initialBlogs.length)
  })

  test('blog identifier is named "id" not "_id"', async () => {
    const response = await api.get('/api/blogs')

    expect(response.body[0].id).toBeDefined()
    expect(response.body[0]._id).toBeUndefined()
  })
})


describe('HTTP POST /api/blogs', async () => {
  test('a valid POST-request adds a new blog when token is valid', async () => {
    const loginResponse = await api
      .post('/api/login')
      .send({ username: 'root', password: 'sekret' })
      .expect(200)

    const token = loginResponse.body.token

    const newBlog = {
      author: 'Jaska Jokunen',
      title: 'Kyllä minä niin mieleni pahoitin',
      url: 'http://www.jaskanblog.fi/kylla_mina_niin_mieleni_pahoitin',
      likes: 69
    }

    const response = await api
      .post('/api/blogs')
      .set('Authorization', `Bearer ${token}`)
      .send(newBlog)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    expect(response.body).toMatchObject(newBlog)
    expect(await Blog.findById(response.body.id)).toMatchObject(newBlog)

    const numAtEnd = (await blogsInDb()).length
    expect(numAtEnd).toBe(initialBlogs.length + 1)
  })

  test('a valid POST-request does nothing without a token', async () => {
    const newBlog = {
      author: 'Jaska Jokunen',
      title: 'Kyllä minä niin mieleni pahoitin',
      url: 'http://www.jaskanblog.fi/kylla_mina_niin_mieleni_pahoitin',
      likes: 69
    }

    await api
      .post('/api/blogs')
      .send(newBlog)
      .expect(401)

    const numAtEnd = (await blogsInDb()).length
    expect(numAtEnd).toBe(initialBlogs.length)
  })

  test('undefined likes is set to 0 on backend while adding', async () => {
    const loginResponse = await api
      .post('/api/login')
      .send({ username: 'root', password: 'sekret' })
      .expect(200)

    const token = loginResponse.body.token

    const newBlog = {
      author: 'Jaska Jokunen',
      title: 'Kyllä minä niin mieleni pahoitin',
      url: 'http://www.jaskanblog.fi/kylla_mina_niin_mieleni_pahoitin'
    }

    const response = await api
      .post('/api/blogs')
      .set('Authorization', `Bearer ${token}`)
      .send(newBlog)
      .expect(201)

    expect(response.body).toMatchObject({ likes: 0 })
    expect(await Blog.findById(response.body.id)).toMatchObject({ likes: 0 })
  })

  test('request without url/title results in status 400 "Bad request"', async () => {
    const loginResponse = await api
      .post('/api/login')
      .send({ username: 'root', password: 'sekret' })
      .expect(200)

    const token = loginResponse.body.token

    const newBlog = {
      author: 'Jaska Jokunen',
      likes: 999
    }

    await api
      .post('/api/blogs')
      .set('Authorization', `Bearer ${token}`)
      .send(newBlog)
      .expect(400)
  })
})

describe('HTTP DELETE /api/blogs/:id', async () => {
  test('succeeds with a valid id/token and number of blogs at the end is less than initially', async () => {
    const loginResponse = await api
      .post('/api/login')
      .send({ username: 'root', password: 'sekret' })
      .expect(200)

    const token = loginResponse.body.token

    const blogsAtStart = await blogsInDb()
    const blogToDelete = blogsAtStart[3]

    await api
      .delete(`/api/blogs/${blogToDelete.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204)

    const blogsAtEnd = await blogsInDb()
    expect(blogsAtEnd.length).toBe(initialBlogs.length - 1)
  })

  test('fails with 401 on invalid token', async () => {
    const blogsAtStart = await blogsInDb()
    const blogToDelete = blogsAtStart[3]

    await api
      .delete(`/api/blogs/${blogToDelete.id}`)
      .expect(401)

    const blogsAtEnd = await blogsInDb()
    expect(blogsAtEnd.length).toBe(initialBlogs.length)
  })

  test('fails with 404 on an invalid id and the number of blogs does not change', async () => {
    const loginResponse = await api
      .post('/api/login')
      .send({ username: 'root', password: 'sekret' })
      .expect(200)

    const token = loginResponse.body.token

    const idToRemove = await blogIdNotFound()
    await api
      .delete(`/api/blogs/${idToRemove}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404)

    const numAtEnd = (await blogsInDb()).length
    expect(numAtEnd).toBe(initialBlogs.length)
  })
})

describe('HTTP PUT /api/blogs/:id', async () => {
  test('succeeds with a valid blog/token and data is updated', async () => {
    const loginResponse = await api
      .post('/api/login')
      .send({ username: 'root', password: 'sekret' })
      .expect(200)

    const token = loginResponse.body.token

    const blogsAtStart = await blogsInDb()
    const original = blogsAtStart[5]

    const updatedBlog = {
      title: 'Type wars [UPDATED]',
      author: 'Robert C. Martin',
      url: 'http://blog.cleancoder.com/uncle-bob/2016/05/01/TypeWars.html',
      likes: 10,
    }

    const response = await api
      .put(`/api/blogs/${original.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send(updatedBlog)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const blogFromDb = await Blog.findById(original.id)
    expect(response.body).toMatchObject(updatedBlog)
    expect(blogFromDb).toMatchObject(updatedBlog)
  })

  test('fails with 401 on an invalid token', async () => {
    const blogsAtStart = await blogsInDb()
    const original = blogsAtStart[5]

    const updatedBlog = {
      title: 'Type wars [UPDATED]',
      author: 'Robert C. Martin',
      url: 'http://blog.cleancoder.com/uncle-bob/2016/05/01/TypeWars.html',
      likes: 10,
    }

    await api
      .put(`/api/blogs/${original.id}`)
      .send(updatedBlog)
      .expect(401)

    const blogFromDb = await Blog.findById(original.id)
    expect(blogFromDb.toJSON()).toMatchObject(original)
  })

  test('fails with 404 on an invalid id', async () => {
    const blogsAtStart = await blogsInDb()
    const original = blogsAtStart[5]

    const updatedBlog = {
      title: 'Type wars [UPDATED]',
      author: 'Robert C. Martin',
      url: 'http://blog.cleancoder.com/uncle-bob/2016/05/01/TypeWars.html',
      likes: 10,
    }

    const idToUpdate = await blogIdNotFound()
    await api
      .put(`/api/blogs/${idToUpdate}`)
      .send(updatedBlog)
      .expect(404)

    const blogFromDb = await Blog.findById(original.id)
    expect(blogFromDb.toJSON()).toMatchObject(original)
  })
})
