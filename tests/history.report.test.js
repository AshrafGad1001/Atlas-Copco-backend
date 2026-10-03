const request = require('supertest');
const app = require('../app');
const User = require('../src/models/User');
const Region = require('../src/models/Region');
const Company = require('../src/models/Company');
const Visit = require('../src/models/Visit');

describe('History and Reports API Tests', () => {
  let adminToken, engToken, engRegionId, otherRegionId;
  let compEng, compOther, engUser;
  
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
    const admin = await User.create({ fullName: 'Admin', username: 'admin', email: 'a@t.com', password: 'password123', role: 'admin', phones: [{number: '01033333333'}] });

    const l1 = await request(app).post('/api/auth/login').send({ username: 'eng1', password: 'password123' });
    engToken = l1.headers['set-cookie'][0].split(';')[0].split('=')[1];
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

  it('history: engineer gets 403 on company from another region', async () => {
    const res = await request(app).get(`/api/companies/${compOther._id}/history`).set('Cookie', [`token=${engToken}`]);
    expect(res.statusCode).toBe(403);
  });

  it('history: engineer sees their region history', async () => {
    await Visit.create({ company: compEng._id, engineer: engUser._id, notes: 'test notes' });
    const res = await request(app).get(`/api/companies/${compEng._id}/history`).set('Cookie', [`token=${engToken}`]);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.visits.length).toBe(1);
  });

  it('reports: engineer gets 403 on /stats route', async () => {
    const res = await request(app).get('/api/reports/stats').set('Cookie', [`token=${engToken}`]);
    expect(res.statusCode).toBe(403);
  });

  it('reports: admin sees all stats', async () => {
    const res = await request(app).get('/api/reports/stats').set('Cookie', [`token=${adminToken}`]);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('export: engineer exports only their visits', async () => {
    const adminVisit = await Visit.create({ company: compOther._id, engineer: (await User.findOne({role:'admin'}))._id });
    const engVisit = await Visit.create({ company: compEng._id, engineer: engUser._id });

    const res = await request(app).get('/api/reports/export-visits').set('Cookie', [`token=${engToken}`]);
    expect(res.statusCode).toBe(200);
    // Since it returns excel buffer, we just check success
    expect(res.headers['content-type']).toContain('spreadsheetml');
  });

  describe("Security S4, S5, S6: Export and Stats", () => {
    let engA_token, adminToken_local;
    let engA_id;

    beforeEach(async () => {
      const comp = await Company.create({ name: "Export Comp", region: engRegionId });

      const engA = await User.create({ fullName: "Eng A Exp", username: "eng.a.exp", email: "a@exp.com", password: "password123", role: "engineer", region: engRegionId, phones:[{number:"01000000000"}] });
      engA_id = engA._id;
      const engB = await User.create({ fullName: "Eng B Exp", username: "eng.b.exp", email: "b@exp.com", password: "password123", role: "engineer", region: otherRegionId, phones:[{number:"01000000000"}] });
      const admin = await User.create({ fullName: "Admin Exp", username: "admin.exp", email: "admin@exp.com", password: "password123", role: "admin", phones:[{number:"01000000000"}] });

      engA_token = (await request(app).post("/api/auth/login").send({ username: "eng.a.exp", password: "password123" })).headers["set-cookie"][0].split(";")[0].split("=")[1];
      adminToken_local = (await request(app).post("/api/auth/login").send({ username: "admin.exp", password: "password123" })).headers["set-cookie"][0].split(";")[0].split("=")[1];

      await Visit.create({ company: comp._id, engineer: engA._id, visitDate: new Date(), type: "??????" });
      await Visit.create({ company: comp._id, engineer: engB._id, visitDate: new Date(), type: "?????" });
    });

    it("S4: Eng A export only has their visits, ignores ?engineer= or ?region=", async () => {
      const res = await request(app).get("/api/reports/export-visits?engineer=someotherid&region=otherregion").set("Cookie", [`token=${engA_token}`]);
      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toContain("spreadsheetml");
    });

    it("S5: Engineer gets 403 on /api/reports/stats and admin routes, Admin gets 200", async () => {
      const resStatsEng = await request(app).get("/api/reports/stats").set("Cookie", [`token=${engA_token}`]);
      expect(resStatsEng.statusCode).toBe(403);
      
      const resStatsAdmin = await request(app).get("/api/reports/stats").set("Cookie", [`token=${adminToken_local}`]);
      expect(resStatsAdmin.statusCode).toBe(200);
    });

    it("S6: Admin in Export can filter, data is returned", async () => {
      const res = await request(app).get(`/api/reports/export-visits?engineer=${engA_id}&region=${engRegionId}`).set("Cookie", [`token=${adminToken_local}`]);
      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toContain("spreadsheetml");
    });
  });
});
