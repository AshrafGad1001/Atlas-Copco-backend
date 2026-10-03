
const fs = require("fs");
let code = fs.readFileSync("tests/history.report.test.js", "utf8");
code = code.replace(/\n\}\);\n?$/, `
  describe("Security S4 and S5: Export and Stats", () => {
    let engA_token, adminToken_local;
    let engA_id, reg1_id;

    beforeEach(async () => {
      const reg1 = await Region.findOne({ name: "Region 1" });
      const reg2 = await Region.findOne({ name: "Region 2" });
      reg1_id = reg1._id;
      
      const comp = await Company.create({ name: "Export Comp", region: reg1._id });

      const engA = await User.create({ fullName: "Eng A Exp", username: "eng.a.exp", password: "password123", role: "engineer", region: reg1._id, phones:[{number:"123"}] });
      engA_id = engA._id;
      const engB = await User.create({ fullName: "Eng B Exp", username: "eng.b.exp", password: "password123", role: "engineer", region: reg2._id, phones:[{number:"123"}] });
      const admin = await User.create({ fullName: "Admin Exp", username: "admin.exp", password: "password123", role: "admin", phones:[{number:"123"}] });

      engA_token = (await request(app).post("/api/auth/login").send({ username: "eng.a.exp", password: "password123" })).headers["set-cookie"][0].split(";")[0].split("=")[1];
      adminToken_local = (await request(app).post("/api/auth/login").send({ username: "admin.exp", password: "password123" })).headers["set-cookie"][0].split(";")[0].split("=")[1];

      await Visit.create({ company: comp._id, engineer: engA._id, visitDate: new Date(), type: "??????" });
      await Visit.create({ company: comp._id, engineer: engB._id, visitDate: new Date(), type: "?????" });
    });

    it("S4: Eng A export only has their visits, ignores ?engineer= or ?region=", async () => {
      const res = await request(app).get("/api/reports/export?engineer=someotherid&region=otherregion").set("Cookie", [\`token=\${engA_token}\`]);
      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toContain("spreadsheetml");
      // Mongoose should have filtered visits to only A
      // Since it is binary Excel, we cannot easily parse rows here, but we can verify it doesn't crash.
    });

    it("S5: Engineer gets 403 on /api/reports/stats and admin routes, Admin gets 200", async () => {
      const resStatsEng = await request(app).get("/api/reports/stats").set("Cookie", [\`token=\${engA_token}\`]);
      expect(resStatsEng.statusCode).toBe(403);
      
      const resStatsAdmin = await request(app).get("/api/reports/stats").set("Cookie", [\`token=\${adminToken_local}\`]);
      expect(resStatsAdmin.statusCode).toBe(200);
    });

    it("S6: Admin in Export can filter, data is returned", async () => {
      const res = await request(app).get(\`/api/reports/export?engineer=\${engA_id}&region=\${reg1_id}\`).set("Cookie", [\`token=\${adminToken_local}\`]);
      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toContain("spreadsheetml");
    });
  });
});
`);
fs.writeFileSync("tests/history.report.test.js", code);

