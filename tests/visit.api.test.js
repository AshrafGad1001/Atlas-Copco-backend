const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../app');
const User = require('../src/models/User');
const Region = require('../src/models/Region');
const Company = require('../src/models/Company');
const Visit = require('../src/models/Visit');

describe('Visit API Tests', () => {
  let adminToken, engToken, eng2Token, engRegionId, otherRegionId;
  let compEng, compOther, engUser, eng2User;
  
  beforeEach(async () => {
    const reg1 = await Region.create({ name: 'Region 1' });
    const reg2 = await Region.create({ name: 'Region 2' });
    engRegionId = reg1._id;
    otherRegionId = reg2._id;

    engUser = await User.create({ fullName: 'Eng1', username: 'eng1', email: 'e1@t.com', password: 'password123', role: 'engineer', region: engRegionId, phones: [{number: '01011111111'}] });
    eng2User = await User.create({ fullName: 'Eng2', username: 'eng2', email: 'e2@t.com', password: 'password123', role: 'engineer', region: otherRegionId, phones: [{number: '01022222222'}] });
    const admin = await User.create({ fullName: 'Admin', username: 'admin', email: 'a@t.com', password: 'password123', role: 'admin', phones: [{number: '01033333333'}] });

    const l1 = await request(app).post('/api/auth/login').send({ username: 'eng1', password: 'password123' });
    engToken = l1.headers['set-cookie'][0].split(';')[0].split('=')[1];
    const l2 = await request(app).post('/api/auth/login').send({ username: 'eng2', password: 'password123' });
    eng2Token = l2.headers['set-cookie'][0].split(';')[0].split('=')[1];
    const la = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'password123' });
    adminToken = la.headers['set-cookie'][0].split(';')[0].split('=')[1];

    compEng = await Company.create({ name: 'Comp Eng1', region: engRegionId });
    compOther = await Company.create({ name: 'Comp Eng2', region: otherRegionId });
  });

  afterEach(async () => {
    await User.deleteMany();
    await Region.deleteMany();
    await Company.deleteMany();
    await Visit.deleteMany();
  });

  it('adding visit to company in another region = 403', async () => {
    const res = await request(app).post('/api/visits').set('Cookie', [`token=${engToken}`]).send({ company: compOther._id, visitDate: new Date() });
    expect(res.statusCode).toBe(403);
  });

  it('updating visit of another engineer = 403', async () => {
    const visit = await Visit.create({ company: compOther._id, engineer: eng2User._id });
    const res = await request(app).put(`/api/visits/${visit._id}`).set('Cookie', [`token=${engToken}`]).send({ company: compOther._id, notes: 'test' });
    expect(res.statusCode).toBe(403);
  });

  it('adding visit with another engineer id sets engineer to me', async () => {
    const res = await request(app).post('/api/visits').set('Cookie', [`token=${engToken}`]).send({ company: compEng._id, engineer: eng2User._id });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.engineer.toString()).toBe(engUser._id.toString());
  });

  it('24-hour edit lock works', async () => {
    const visit = await Visit.create({ company: compEng._id, engineer: engUser._id, notes: 'old' });
    // change createdAt to 25 hours ago
    const past = new Date(Date.now() - 25 * 60 * 60 * 1000);
    await mongoose.connection.collection('visits').updateOne({ _id: visit._id }, { $set: { createdAt: past } });

    const check = await Visit.findById(visit._id);
    const res = await request(app).put(`/api/visits/${visit._id}`).set('Cookie', [`token=${engToken}`]).send({ company: compEng._id, notes: 'new' });
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toContain('24 ساعة');
  });

  it('attendees is optional and works, name is required if row added', async () => {
    const res1 = await request(app).post('/api/visits').set('Cookie', [`token=${engToken}`]).send({ company: compEng._id });
    expect(res1.statusCode).toBe(201);

    const res2 = await request(app).post('/api/visits').set('Cookie', [`token=${engToken}`]).send({ company: compEng._id, attendees: [{}] });
    expect(res2.statusCode).toBe(400); // Validation error (Zod: name is required)
    
    const res3 = await request(app).post('/api/visits').set('Cookie', [`token=${engToken}`]).send({ company: compEng._id, attendees: [{name: 'Ashraf', phone: '01012345678'}] });
    expect(res3.statusCode).toBe(201);
    expect(res3.body.data.attendees.length).toBe(1);
    expect(res3.body.data.attendees[0].name).toBe('Ashraf');
  });
});
