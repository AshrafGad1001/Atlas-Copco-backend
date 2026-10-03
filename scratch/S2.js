
const fs = require("fs");
let code = fs.readFileSync("tests/company.api.test.js", "utf8");
code = code.replace(/\n\}\);\n?$/, `
  describe("Security S2: filter ?region=", () => {
    let reg1, reg2;

    beforeEach(async () => {
      reg1 = await Region.findOne({ name: "Reg1" });
      reg2 = await Region.findOne({ name: "Reg2" });
      await Company.create({ name: "C1", region: reg1._id, phone: "01000000000", isClient: true });
      await Company.create({ name: "C2", region: reg2._id, phone: "01000000000", isClient: true });
    });

    it("Admin can filter by region, engineer ignores ?region= and sticks to their region", async () => {
      // Admin filtering Reg2
      const resAdmin = await request(app).get("/api/companies?region=" + reg2._id).set("Cookie", [\`token=\${adminToken}\`]);
      expect(resAdmin.statusCode).toBe(200);
      expect(resAdmin.body.data.length).toBe(1);
      expect(resAdmin.body.data[0].name).toBe("C2");

      // Engineer 1 (Region 1) trying to filter Reg2
      const resEng = await request(app).get("/api/companies?region=" + reg2._id).set("Cookie", [\`token=\${engToken}\`]);
      expect(resEng.statusCode).toBe(200);
      expect(resEng.body.data.length).toBeGreaterThan(0);
      // It should ignore ?region=reg2._id and return C1 (since Eng is in Reg1)
      expect(resEng.body.data[0].name).toBe("C1");
    });
  });
});
`);
fs.writeFileSync("tests/company.api.test.js", code);

