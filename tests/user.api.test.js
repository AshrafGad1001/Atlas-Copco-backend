const request = require('supertest');
const app = require('../app');
const User = require('../src/models/User');

describe('User API Endpoints', () => {
  let adminToken;
  let userId;

  beforeEach(async () => {
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
    const Region = require('../src/models/Region');
    const region = await Region.create({ name: 'Test Region' });

    const res = await request(app)
      .post('/api/users')
      .set('Cookie', [`token=${adminToken}`])
      .send({ 
        fullName: 'Eng', 
        username: 'eng3', 
        email: 'eng3@test.com',
        role: 'engineer',
        password: 'password123',
        region: region._id,
        phones: [{ number: '01012345678' }]
      });
    
    expect(res.statusCode).toBe(201);
  });

  it('should update user', async () => {
    const Region = require('../src/models/Region');
    const region = await Region.create({ name: 'Test Region 2' });
    
    const eng = await User.create({
      fullName: 'Eng', 
      username: 'eng4', 
      email: 'eng4@test.com',
      role: 'engineer',
      password: 'password123',
      region: region._id,
      phones: [{ number: '01012345678' }]
    });

    const res = await request(app)
      .put(`/api/users/${eng._id}`)
      .set('Cookie', [`token=${adminToken}`])
      .send({ 
        fullName: 'Eng Updated',
        username: 'eng4',
        email: 'eng4@test.com',
        role: 'engineer',
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
