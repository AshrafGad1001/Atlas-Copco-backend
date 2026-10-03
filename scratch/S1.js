
const fs = require("fs");
let code = fs.readFileSync("tests/company.api.test.js", "utf8");
code = code.replace(/\n\}\);\n?$/, `
  describe("Security S1: Company by ID cross-region", () => {
    let companyId;
    let otherEngToken;

    beforeEach(async () => {
      const reg1 = await Region.findOne({ name: "Reg1" });
      const reg2 = await Region.findOne({ name: "Reg2" });
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
      const resGet = await request(app).get("/api/companies/" + companyId + "/history").set("Cookie", [\`token=\${otherEngToken}\`]);
      expect(resGet.statusCode).toBe(403);

      // 2. PUT (update)
      const resPut = await request(app).put("/api/companies/" + companyId).set("Cookie", [\`token=\${otherEngToken}\`]).send({ name: "Hacked", phone: "01000000000", isClient: true });
      expect(resPut.statusCode).toBe(403);

      // 3. DELETE
      const resDel = await request(app).delete("/api/companies/" + companyId).set("Cookie", [\`token=\${otherEngToken}\`]);
      expect(resDel.statusCode).toBe(403);

      // 4. Admin 200
      const resAdminGet = await request(app).get("/api/companies/" + companyId + "/history").set("Cookie", [\`token=\${adminToken}\`]);
      expect(resAdminGet.statusCode).toBe(200);

      const resAdminPut = await request(app).put("/api/companies/" + companyId).set("Cookie", [\`token=\${adminToken}\`]).send({ name: "Admin Edited", phone: "01000000000", isClient: true });
      expect(resAdminPut.statusCode).toBe(200);

      const resAdminDel = await request(app).delete("/api/companies/" + companyId).set("Cookie", [\`token=\${adminToken}\`]);
      expect(resAdminDel.statusCode).toBe(200);
    });
  });
});
`);
fs.writeFileSync("tests/company.api.test.js", code);

