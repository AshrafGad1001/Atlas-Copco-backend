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
      .send({ name: 'Comp1', region: otherRegionId });
    
    expect(res.statusCode).toBe(201);
    expect(res.body.data.region.toString()).toBe(engRegionId.toString());
  });

  it('engineer sees only their region companies', async () => {
    await Company.create({ name: 'Comp1', region: engRegionId });
    await Company.create({ name: 'Comp2', region: otherRegionId });

    const res = await request(app).get('/api/companies').set('Cookie', [`token=${engToken}`]);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe('Comp1');
  });

  it('admin sees all companies', async () => {
    await Company.create({ name: 'Comp1', region: engRegionId });
    await Company.create({ name: 'Comp2', region: otherRegionId });

    const res = await request(app).get('/api/companies').set('Cookie', [`token=${adminToken}`]);
    expect(res.body.data.length).toBe(2);
  });

  it('engineer gets 403 on company from another region (update/delete)', async () => {
    const comp = await Company.create({ name: 'Comp2', region: otherRegionId });
    const res = await request(app).delete(`/api/companies/${comp._id}`).set('Cookie', [`token=${engToken}`]);
    expect(res.statusCode).toBe(403);
  });

  it('duplicate name is prevented (Mongoose E11000)', async () => {
    await request(app).post('/api/companies').set('Cookie', [`token=${adminToken}`]).send({ name: 'unique', region: engRegionId });
    const res = await request(app).post('/api/companies').set('Cookie', [`token=${adminToken}`]).send({ name: 'unique', region: engRegionId });
    expect(res.statusCode).toBe(409);
  });
  
  it('duplicate name with arabic variation is prevented', async () => {
    await request(app).post('/api/companies').set('Cookie', [`token=${adminToken}`]).send({ name: 'شركة أطلس', region: engRegionId });
    const res = await request(app).post('/api/companies').set('Cookie', [`token=${adminToken}`]).send({ name: 'شركة اطلس', region: engRegionId });
    expect(res.statusCode).toBe(409);
  });
  
  it('search works with arabic variations', async () => {
    await request(app).post('/api/companies').set('Cookie', [`token=${adminToken}`]).send({ name: 'شركة أطلس', region: engRegionId });
    const res = await request(app).get('/api/companies?search=اطلس').set('Cookie', [`token=${adminToken}`]);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe('شركة أطلس');
  });
});
