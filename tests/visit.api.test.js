const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../app');
const User = require('../src/models/User');
const Region = require('../src/models/Region');
const Company = require('../src/models/Company');
const Visit = require('../src/models/Visit');

describe('Visit API Tests', () => {
  let adminToken, engToken, eng2Token, eng3Token, engRegionId, otherRegionId;
  let compEng, compOther, engUser, eng2User, eng3User;
  
  beforeEach(async () => {
    await User.deleteMany();
    await Region.deleteMany();
    await Company.deleteMany();
    await Visit.deleteMany();
    await Region.deleteMany();
    await User.deleteMany();
    const reg1 = await Region.create({ name: 'Region 1' });
    const reg2 = await Region.create({ name: 'Region 2' });
    engRegionId = reg1._id;
    otherRegionId = reg2._id;

    engUser = await User.create({ fullName: 'Eng1', username: 'eng1', email: 'e1@t.com', password: 'password123', role: 'engineer', region: engRegionId, phones: [{number: '01011111111'}] });
    eng3User = await User.create({ fullName: 'Eng3', username: 'eng3', email: 'e3@t.com', password: 'password123', role: 'engineer', region: engRegionId, phones: [{number: '01033333331'}] }); // Same region
    eng2User = await User.create({ fullName: 'Eng2', username: 'eng2', email: 'e2@t.com', password: 'password123', role: 'engineer', region: otherRegionId, phones: [{number: '01022222222'}] });
    const admin = await User.create({ fullName: 'Admin', username: 'admin', email: 'a@t.com', password: 'password123', role: 'admin', phones: [{number: '01033333333'}] });

    const l1 = await request(app).post('/api/auth/login').send({ username: 'eng1', password: 'password123' });
    engToken = l1.headers['set-cookie'][0].split(';')[0].split('=')[1];
    const l3 = await request(app).post('/api/auth/login').send({ username: 'eng3', password: 'password123' });
    eng3Token = l3.headers['set-cookie'][0].split(';')[0].split('=')[1];
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
    await Region.deleteMany();
    await User.deleteMany();
  });

  it('adding visit to company in another region = 403', async () => {
    const res = await request(app).post('/api/visits').set('Cookie', [`token=${engToken}`]).send({ company: compOther._id, visitDate: new Date() });
    expect(res.statusCode).toBe(403);
  });

  it('updating visit of another engineer = 403 (even in same region)', async () => {
    const visit = await Visit.create({ company: compEng._id, engineer: engUser._id });
    const res = await request(app).put(`/api/visits/${visit._id}`).set('Cookie', [`token=${eng3Token}`]).send({ company: compEng._id, notes: 'test' });
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
    expect(res2.body.errors[0].field).toBe('attendees.0.name');
    
    const res3 = await request(app).post('/api/visits').set('Cookie', [`token=${engToken}`]).send({ company: compEng._id, attendees: [{name: 'Ashraf', phone: '01012345678'}] });
    expect(res3.statusCode).toBe(201);
    expect(res3.body.data.attendees.length).toBe(1);
    expect(res3.body.data.attendees[0].name).toBe('Ashraf');
  });

  describe("Security S3: My visits and cross-region visit by ID", () => {
    let engA_token, engC_token, otherEng_token;
    let visitA_id;

    beforeEach(async () => {
      const comp = await Company.create({ name: "Test Comp S3", region: engRegionId });

      const engA = await User.create({ fullName: "Eng A", username: "eng.a", email: "a@test.com", password: "password123", role: "engineer", region: engRegionId, phones:[{number:"01000000000"}] });
      const engC = await User.create({ fullName: "Eng C", username: "eng.c", email: "c@test.com", password: "password123", role: "engineer", region: engRegionId, phones:[{number:"01000000000"}] });
      const engB = await User.create({ fullName: "Eng B", username: "eng.b", email: "b@test.com", password: "password123", role: "engineer", region: otherRegionId, phones:[{number:"01000000000"}] });

      engA_token = (await request(app).post("/api/auth/login").send({ username: "eng.a", password: "password123" })).headers["set-cookie"][0].split(";")[0].split("=")[1];
      engC_token = (await request(app).post("/api/auth/login").send({ username: "eng.c", password: "password123" })).headers["set-cookie"][0].split(";")[0].split("=")[1];
      otherEng_token = (await request(app).post("/api/auth/login").send({ username: "eng.b", password: "password123" })).headers["set-cookie"][0].split(";")[0].split("=")[1];

      const vA = await Visit.create({ company: comp._id, engineer: engA._id, visitDate: new Date(), type: "مكتملة" });
      visitA_id = vA._id;
      await Visit.create({ company: comp._id, engineer: engC._id, visitDate: new Date(), type: "مكتملة" });
    });

    it("Eng A sees only their visits, even if Eng C is in same region and visited same company", async () => {
      const resA = await request(app).get("/api/visits").set("Cookie", [`token=${engA_token}`]);
      expect(resA.statusCode).toBe(200);
      expect(resA.body.data.length).toBe(1); // Only A's visit
      expect(resA.body.data[0].engineer._id.toString()).toBe(visitA_id ? (await Visit.findById(visitA_id)).engineer.toString() : "");
    });

    it("Eng from another region getting 403 on updating a visit", async () => {
      const res = await request(app).put("/api/visits/" + visitA_id).set("Cookie", [`token=${otherEng_token}`]).send({
        company: (await Visit.findById(visitA_id)).company,
        visitDate: new Date(), type: "مكتملة"
      });
      // It should be 403
      expect(res.statusCode).toBe(403);
    });
  });
});
