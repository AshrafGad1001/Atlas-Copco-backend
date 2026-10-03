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
  describe("Security S1: Company by ID cross-region", () => {
    let companyId;
    let otherEngToken;

    beforeEach(async () => {
      const reg1 = await Region.findOne({ name: "Region 1" });
      const reg2 = await Region.findOne({ name: "Region 2" });
      const comp = await Company.create({ name: "Reg1 Company S1", region: reg1._id, phone: "01000000000", isClient: true });
      companyId = comp._id;

      const otherEng = await User.create({
        fullName: "Other Eng S1",
        username: "other.eng.s1",
        email: "others1@test.com",
        password: "password123",
        role: "engineer",
        region: reg2._id,
        isActive: true,
        phones: [{ number: "01000000000" }]
      });

      const res = await request(app).post("/api/auth/login").send({ username: "other.eng.s1", password: "password123" });
      otherEngToken = res.headers["set-cookie"][0].split(";")[0].split("=")[1];
    });

    it("should return 403 for GET history, PUT, DELETE from other region engineer, but 200 for admin", async () => {
      // 1. GET history (as a proxy for GET)
      const resGet = await request(app).get("/api/companies/" + companyId + "/history").set("Cookie", [`token=${otherEngToken}`]);
      expect(resGet.statusCode).toBe(403);

      // 2. PUT (update)
      const resPut = await request(app).put("/api/companies/" + companyId).set("Cookie", [`token=${otherEngToken}`]).send({ name: "Hacked", region: reg2._id, phone: "01000000000", isClient: true });
      expect(resPut.statusCode).toBe(403);

      // 3. DELETE
      const resDel = await request(app).delete("/api/companies/" + companyId).set("Cookie", [`token=${otherEngToken}`]);
      expect(resDel.statusCode).toBe(403);

      // 4. Admin 200
      const resAdminGet = await request(app).get("/api/companies/" + companyId + "/history").set("Cookie", [`token=${adminToken}`]);
      expect(resAdminGet.statusCode).toBe(200);

      const resAdminPut = await request(app).put("/api/companies/" + companyId).set("Cookie", [`token=${adminToken}`]).send({ name: "Admin Edited", region: reg1._id, phone: "01000000000", isClient: true });
      expect(resAdminPut.statusCode).toBe(200);

      const resAdminDel = await request(app).delete("/api/companies/" + companyId).set("Cookie", [`token=${adminToken}`]);
      expect(resAdminDel.statusCode).toBe(200);
    });
  });
  describe("Security S2: filter ?region=", () => {
    let reg1, reg2;

    beforeEach(async () => {
      reg1 = await Region.findOne({ name: "Region 1" });
      reg2 = await Region.findOne({ name: "Region 2" });
      await Company.create({ name: "C1", region: reg1._id, phone: "01000000000", isClient: true });
      await Company.create({ name: "C2", region: reg2._id, phone: "01000000000", isClient: true });
    });

    it("Admin can filter by region, engineer ignores ?region= and sticks to their region", async () => {
      // Admin filtering Reg2
      const resAdmin = await request(app).get("/api/companies?region=" + reg2._id).set("Cookie", [`token=${adminToken}`]);
      expect(resAdmin.statusCode).toBe(200);
      expect(resAdmin.body.data.length).toBe(1);
      expect(resAdmin.body.data[0].name).toBe("C2");

      // Engineer 1 (Region 1) trying to filter Reg2
      const resEng = await request(app).get("/api/companies?region=" + reg2._id).set("Cookie", [`token=${engToken}`]);
      expect(resEng.statusCode).toBe(200);
      expect(resEng.body.data.length).toBeGreaterThan(0);
      // It should ignore ?region=reg2._id and return C1 (since Eng is in Reg1)
      expect(resEng.body.data[0].name).toBe("C1");
    });
  });
});
