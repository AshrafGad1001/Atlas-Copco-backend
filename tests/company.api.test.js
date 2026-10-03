
const request = require("supertest");
const app = require("../app");
const User = require("../src/models/User");
const Region = require("../src/models/Region");
const Company = require("../src/models/Company");

describe("Company API Tests", () => {
  let adminToken, engToken, engRegionId, otherRegionId;

  beforeEach(async () => {
    await User.deleteMany();
    await Region.deleteMany();
    await Company.deleteMany();
    const reg1 = await Region.create({ name: "Region 1" });
    const reg2 = await Region.create({ name: "Region 2" });
    engRegionId = reg1._id;
    otherRegionId = reg2._id;

    const admin = await User.create({ fullName: "Admin", username: "admin", email: "admin@t.com", password: "password123", role: "admin", phones: [{number: "01011111111"}] });
    const eng = await User.create({ fullName: "Eng", username: "eng", email: "eng@t.com", password: "password123", role: "engineer", region: engRegionId, phones: [{number: "01022222222"}] });

    const adminLogin = await request(app).post("/api/auth/login").send({ username: "admin", password: "password123" });
    adminToken = adminLogin.headers["set-cookie"][0].split(";")[0].split("=")[1];

    const engLogin = await request(app).post("/api/auth/login").send({ username: "eng", password: "password123" });
    engToken = engLogin.headers["set-cookie"][0].split(";")[0].split("=")[1];
  });

  
  it("B4 duplicate logic exact match returns 409 DUPLICATE", async () => {
    await Company.create({ nameAr: "\u0623\u062d\u0645\u062f", region: engRegionId });
    const res = await request(app)
      .post("/api/companies")
      .set("Cookie", [`token=${adminToken}`])
      .send({ nameAr: "\u0627\u062d\u0645\u062f", region: engRegionId });
    
    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe("DUPLICATE");
  });

  it("B4 duplicate logic similar match returns 409 SIMILAR_EXISTS unless confirmSimilar=true", async () => {
    await Company.create({ nameAr: "\u0623\u062d\u0645\u062f \u0645\u062d\u0645\u062f", region: engRegionId });
    const payload = { nameAr: "\u0623\u062d\u0645\u062f", region: engRegionId };
    
    let res = await request(app)
      .post("/api/companies")
      .set("Cookie", [`token=${adminToken}`])
      .send(payload);
    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe("SIMILAR_EXISTS");

    res = await request(app)
      .post("/api/companies?confirmSimilar=true")
      .set("Cookie", [`token=${adminToken}`])
      .send(payload);
    expect(res.statusCode).toBe(201);
  });

  
  it("B5 engineer updating ignores region, rejects isDeleted, but admin can do both", async () => {
    const comp = await Company.create({ nameAr: "Test B5", region: engRegionId });
    
    // Engineer tries to change region
    let res = await request(app)
      .patch(`/api/companies/${comp._id}`)
      .set("Cookie", [`token=${engToken}`])
      .send({ nameAr: "Test B5 Updated", region: otherRegionId });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.region.toString()).toBe(engRegionId.toString()); // region ignored

    // Engineer tries to set isDeleted
    res = await request(app)
      .patch(`/api/companies/${comp._id}`)
      .set("Cookie", [`token=${engToken}`])
      .send({ isDeleted: true });
    expect(res.statusCode).toBe(403);

    // Engineer tries to delete
    res = await request(app)
      .delete(`/api/companies/${comp._id}`)
      .set("Cookie", [`token=${engToken}`]);
    expect(res.statusCode).toBe(403);

    // Admin tries to change region
    res = await request(app)
      .patch(`/api/companies/${comp._id}`)
      .set("Cookie", [`token=${adminToken}`])
      .send({ region: otherRegionId });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.region.toString()).toBe(otherRegionId.toString());

    // Admin tries to soft delete
    res = await request(app)
      .delete(`/api/companies/${comp._id}`)
      .set("Cookie", [`token=${adminToken}`]);
    expect(res.statusCode).toBe(200);
    
    const checkDeleted = await Company.findById(comp._id);
    expect(checkDeleted.isDeleted).toBe(true);
  });

  afterEach(async () => {
    await User.deleteMany();
    await Region.deleteMany();
    await Company.deleteMany();
  });

  it("engineer adding company sets region to engineer region even if another region is provided", async () => {
    const res = await request(app)
      .post("/api/companies")
      .set("Cookie", [`token=${engToken}`])
      .send({ nameAr: "Comp1", region: otherRegionId });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.region.toString()).toBe(engRegionId.toString());
    expect(res.body.data.nameArNorm).toBe("comp1"); // B2 test
  });

  it("create and update generate normalized names (B2)", async () => {
    const res = await request(app)
      .post("/api/companies")
      .set("Cookie", [`token=${adminToken}`])
      .send({ nameAr: "\u0623\u062d\u0645\u062f", nameEn: "Ahmad", region: engRegionId });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.nameArNorm).toBe("\u0627\u062d\u0645\u062f");
    expect(res.body.data.nameEnNorm).toBe("ahmad");

    const resUpdate = await request(app)
      .patch(`/api/companies/${res.body.data._id}`)
      .set("Cookie", [`token=${adminToken}`])
      .send({ nameAr: "\u0645\u062f\u064a\u0646\u0629" });
    expect(resUpdate.statusCode).toBe(200);
    expect(resUpdate.body.data.nameArNorm).toBe("\u0645\u062f\u064a\u0646\u0647");
  });

  it("B3 search handles Arabic variations and regex escapes", async () => {
    await Company.create({ nameAr: "\u0623\u062d\u0645\u062f \u0645\u0635\u0646\u0639", region: engRegionId });
    await Company.create({ nameAr: "\u0645\u062f\u064a\u0646\u0640\u0640\u0629", region: engRegionId });
    await Company.create({ nameEn: "Global Factory", region: engRegionId });
    await Company.create({ nameAr: "\u0645\u062d\u0630\u0648\u0641", region: engRegionId, isDeleted: true });
    await Company.create({ nameAr: "\u0623\u062d\u0645\u062f \u0645\u0646\u0637\u0642\u0629 \u062a\u0627\u0646\u064a\u0629", region: otherRegionId });
    
    // search ????
    let res = await request(app).get("/api/companies?search=" + encodeURIComponent("\u0627\u062d\u0645\u062f")).set("Cookie", [`token=${adminToken}`]);
    expect(res.body.data.length).toBe(2);
    
    // search ????
    res = await request(app).get("/api/companies?search=" + encodeURIComponent("\u0645\u0635\u0646\u0639")).set("Cookie", [`token=${adminToken}`]);
    expect(res.body.data.length).toBe(1);

    // search english case insensitive
    res = await request(app).get("/api/companies?search=" + encodeURIComponent("GLOBAL factory")).set("Cookie", [`token=${adminToken}`]);
    expect(res.body.data.length).toBe(1);

    // search regex chars
    res = await request(app).get("/api/companies?search=" + encodeURIComponent("( [ * ")).set("Cookie", [`token=${adminToken}`]);
    expect(res.statusCode).toBe(200);

    // engineer isolation
    res = await request(app).get("/api/companies?search=" + encodeURIComponent("\u0627\u062d\u0645\u062f")).set("Cookie", [`token=${engToken}`]);
    expect(res.body.data.length).toBe(1);
    
    // deleted hidden
    res = await request(app).get("/api/companies?search=" + encodeURIComponent("\u0645\u062d\u0630\u0648\u0641")).set("Cookie", [`token=${adminToken}`]);
    expect(res.body.data.length).toBe(0);
  });

});

