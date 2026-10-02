const request = require('supertest');
const app = require('../app');
const User = require('../src/models/User');
const Region = require('../src/models/Region');

describe('Region API Endpoints', () => {
  let adminToken;
  let regionId;

  beforeAll(async () => {
    const adminUser = await User.create({
      fullName: 'Admin',
      username: 'admin',
      email: 'admin@test.com',
      role: 'admin',
      password: 'password123'
    });
    
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'password123' });
    
    if (res.headers['set-cookie']) {
      adminToken = res.headers['set-cookie'][0].split(';')[0].split('=')[1];
    }
  });

  afterAll(async () => {
    await User.deleteMany();
    await Region.deleteMany();
  });

  it('should create a region', async () => {
    const res = await request(app)
      .post('/api/regions')
      .set('Cookie', [`token=${adminToken}`])
      .send({ name: 'Cairo' });
    
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    regionId = res.body.data._id;
  });

  it('should get all regions', async () => {
    const res = await request(app)
      .get('/api/regions')
      .set('Cookie', [`token=${adminToken}`]);
    
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('should update a region', async () => {
    const res = await request(app)
      .put(`/api/regions/${regionId}`)
      .set('Cookie', [`token=${adminToken}`])
      .send({ name: 'Giza' });
    
    expect(res.statusCode).toBe(200);
    expect(res.body.data.name).toBe('Giza');
  });

  it('should not delete region with users', async () => {
    await User.create({
      fullName: 'Eng',
      username: 'eng',
      email: 'eng@test.com',
      role: 'engineer',
      password: 'password123',
      region: regionId,
      phones: [{ number: '01012345678' }]
    });

    const res = await request(app)
      .delete(`/api/regions/${regionId}`)
      .set('Cookie', [`token=${adminToken}`]);
    
    expect(res.statusCode).toBe(400);
  });
});
