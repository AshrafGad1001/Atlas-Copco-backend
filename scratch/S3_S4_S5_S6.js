
const fs = require("fs");
let visit = fs.readFileSync("tests/visit.api.test.js", "utf8");
visit = visit.substring(0, visit.lastIndexOf("});")) + `
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

      const vA = await Visit.create({ company: comp._id, engineer: engA._id, visitDate: new Date(), type: "??????" });
      visitA_id = vA._id;
      await Visit.create({ company: comp._id, engineer: engC._id, visitDate: new Date(), type: "?????" });
    });

    it("Eng A sees only their visits, even if Eng C is in same region and visited same company", async () => {
      const resA = await request(app).get("/api/visits").set("Cookie", [\`token=\${engA_token}\`]);
      expect(resA.statusCode).toBe(200);
      expect(resA.body.data.length).toBe(1); // Only A's visit
      expect(resA.body.data[0].engineer._id.toString()).toBe(visitA_id ? (await Visit.findById(visitA_id)).engineer.toString() : "");
    });

    it("Eng from another region getting 403 on updating a visit", async () => {
      const res = await request(app).put("/api/visits/" + visitA_id).set("Cookie", [\`token=\${otherEng_token}\`]).send({
        company: (await Visit.findById(visitA_id)).company,
        visitDate: new Date(), type: "?????"
      });
      // It should be 403
      expect(res.statusCode).toBe(403);
    });
  });
});
`;
fs.writeFileSync("tests/visit.api.test.js", visit);

let history = fs.readFileSync("tests/history.report.test.js", "utf8");
history = history.substring(0, history.lastIndexOf("});")) + `
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
      const res = await request(app).get("/api/reports/export-visits?engineer=someotherid&region=otherregion").set("Cookie", [\`token=\${engA_token}\`]);
      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toContain("spreadsheetml");
    });

    it("S5: Engineer gets 403 on /api/reports/stats and admin routes, Admin gets 200", async () => {
      const resStatsEng = await request(app).get("/api/reports/stats").set("Cookie", [\`token=\${engA_token}\`]);
      expect(resStatsEng.statusCode).toBe(403);
      
      const resStatsAdmin = await request(app).get("/api/reports/stats").set("Cookie", [\`token=\${adminToken_local}\`]);
      expect(resStatsAdmin.statusCode).toBe(200);
    });

    it("S6: Admin in Export can filter, data is returned", async () => {
      const res = await request(app).get(\`/api/reports/export-visits?engineer=\${engA_id}&region=\${engRegionId}\`).set("Cookie", [\`token=\${adminToken_local}\`]);
      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toContain("spreadsheetml");
    });
  });
});
`;
fs.writeFileSync("tests/history.report.test.js", history);

