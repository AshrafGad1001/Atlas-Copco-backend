const request = require('supertest');
const app = require('../app');
const User = require('../src/models/User');

describe('Profile API', () => {
  let token;
  let userId;

  beforeEach(async () => {
    await User.deleteMany();
    const Region = require('../src/models/Region');
    await Region.deleteMany();
    const reg = await Region.create({ name: 'Reg1' });
    const user = await User.create({
      fullName: 'Test User',
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'engineer',
      region: reg._id,
      isActive: true,
      phones: [{ number: '01000000000' }]
    });
    userId = user._id;

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'password123' });
    
    token = res.headers['set-cookie'][0].split(';')[0].split('=')[1];
  });

  afterEach(async () => {
    await User.deleteMany();
    const Region = require('../src/models/Region');
    await Region.deleteMany();
  });

  it('PATCH /api/profile ignores role, region, username, isActive, _id', async () => {
    const res = await request(app)
      .patch('/api/profile')
      .set('Cookie', [`token=${token}`])
      .send({
        fullName: 'New Name',
        role: 'admin',
        region: 'new-region',
        username: 'newusername',
        isActive: false,
        _id: 'some-other-id'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fullName).toBe('New Name');
    expect(res.body.data.role).toBe('engineer');
    expect(res.body.data.username).toBe('testuser');
    expect(res.body.data.isActive).toBe(true);
    expect(res.body.data._id.toString()).toBe(userId.toString());
  });
});
