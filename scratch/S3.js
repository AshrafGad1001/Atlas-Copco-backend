
const fs = require("fs");
let code = fs.readFileSync("tests/visit.api.test.js", "utf8");
code = code.replace(/\n\}\);\n?$/, `
  describe("Security S3: My visits and cross-region visit by ID", () => {
    let engA_token, engC_token, otherEng_token;
    let visitA_id;

    beforeEach(async () => {
      const reg1 = await Region.findOne({ name: "Region 1" });
      const reg2 = await Region.findOne({ name: "Region 2" });
      
      const comp = await Company.create({ name: "Test Comp S3", region: reg1._id });

      const engA = await User.create({ fullName: "Eng A", username: "eng.a", password: "password123", role: "engineer", region: reg1._id, phones:[{number:"123"}] });
      const engC = await User.create({ fullName: "Eng C", username: "eng.c", password: "password123", role: "engineer", region: reg1._id, phones:[{number:"123"}] });
      const engB = await User.create({ fullName: "Eng B", username: "eng.b", password: "password123", role: "engineer", region: reg2._id, phones:[{number:"123"}] });

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
`);
fs.writeFileSync("tests/visit.api.test.js", code);

