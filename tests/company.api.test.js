const request = require('supertest');
const app = require('../app');
const User = require('../src/models/User');
const Region = require('../src/models/Region');
const Company = require('../src/models/Company');

describe('Company API Tests', () => {
  let adminToken, engToken, engRegionId, otherRegionId;

  beforeEach(async () => {
    await User.deleteMany();
    await Region.deleteMany();
    await Company.deleteMany();
    const reg1 = await Region.create({ name: 'Region 1' });
    const reg2 = await Region.create({ name: 'Region 2' });
    engRegionId = reg1._id;
    otherRegionId = reg2._id;

    const admin = await User.create({ fullName: 'Admin', username: 'admin', email: 'admin@t.com', password: 'password123', role: 'admin', phones: [{number: '01011111111'}] });
    const eng = await User.create({ fullName: 'Eng', username: 'eng', email: 'eng@t.com', password: 'password123', role: 'engineer', region: engRegionId, phones: [{number: '01022222222'}] });

    const adminLogin = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'password123' });
    adminToken = adminLogin.headers['set-cookie'][0].split(';')[0].split('=')[1];

    const engLogin = await request(app).post('/api/auth/login').send({ username: 'eng', password: 'password123' });
    engToken = engLogin.headers['set-cookie'][0].split(';')[0].split('=')[1];
  });

  afterEach(async () => {
    await User.deleteMany();
    await Region.deleteMany();
    await Company.deleteMany();
  });

  it('engineer adding company sets region to engineer region even if another region is provided', async () => {
    const res = await request(app)
      .post('/api/companies')
      .set('Cookie', [`token=${engToken}`])
      .send({ nameAr: 'Comp1', region: otherRegionId });
    
    expect(res.statusCode).toBe(201);
    expect(res.body.data.region.toString()).toBe(engRegionId.toString());
    expect(res.body.data.nameArNorm).toBe('comp1'); // B2 test
  });

  it('create and update generate normalized names (B2)', async () => {
    const res = await request(app)
      .post('/api/companies')
      .set('Cookie', [`token=${adminToken}`])
      .send({ nameAr: 'أحمد', nameEn: 'Ahmad', region: engRegionId });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.nameArNorm).toBe('احمد');
    expect(res.body.data.nameEnNorm).toBe('ahmad');

    const resUpdate = await request(app)
      .patch(`/api/companies/${res.body.data._id}`)
      .set('Cookie', [`token=${adminToken}`])
      .send({ nameAr: 'مدينة' });
    
    expect(resUpdate.statusCode).toBe(200);
    expect(resUpdate.body.data.nameArNorm).toBe('مدينه');
  });

});
