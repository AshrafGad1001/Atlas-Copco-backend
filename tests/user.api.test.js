const request = require('supertest');
const app = require('../app');
const User = require('../src/models/User');

describe('User API Endpoints', () => {
  let adminToken;
  let userId;

  beforeAll(async () => {
    const adminUser = await User.create({
      fullName: 'Admin',
      username: 'admin2',
      email: 'admin2@test.com',
      role: 'admin',
      password: 'password123'
    });
    
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin2', password: 'password123' });
    
    if (res.headers['set-cookie']) {
      adminToken = res.headers['set-cookie'][0].split(';')[0].split('=')[1];
    }
  });

  afterAll(async () => {
    await User.deleteMany();
  });

  it('should create an engineer', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Cookie', [`token=${adminToken}`])
      .send({ 
        fullName: 'Eng', 
        username: 'eng3', 
        email: 'eng3@test.com',
        role: 'engineer',
        password: 'password123',
        phones: [{ number: '01012345678' }]
      });
    
    expect(res.statusCode).toBe(201);
    userId = res.body.data._id;
  });

  it('should update user', async () => {
    const res = await request(app)
      .put(`/api/users/${userId}`)
      .set('Cookie', [`token=${adminToken}`])
      .send({ 
        fullName: 'Eng Updated',
        username: 'eng3'
      });
    
    expect(res.statusCode).toBe(200);
    expect(res.body.data.fullName).toBe('Eng Updated');
  });

  it('should get users', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Cookie', [`token=${adminToken}`]);
    
    expect(res.statusCode).toBe(200);
  });
});
