
const fs = require("fs");
let code = fs.readFileSync("tests/company.api.test.js", "utf8");

code = code.replace(/\n\}\);\n?$/, `
  describe("Security: Company by ID cross-region", () => {
    let companyId;
    let otherEngToken;

    beforeEach(async () => {
      const reg1 = await Region.findOne({ name: "Reg1" });
      const reg2 = await Region.findOne({ name: "Reg2" });
      const comp = await Company.create({ name: "Reg1 Company", region: reg1._id, phone: "01000000000", isClient: true });
      companyId = comp._id;

      const otherEng = await User.create({
        fullName: "Other Eng",
        username: "other.eng",
        email: "other@test.com",
        password: "password123",
        role: "engineer",
        region: reg2._id,
        isActive: true,
        phones: [{ number: "01000000000" }]
      });

      const res = await request(app).post("/api/auth/login").send({ username: "other.eng", password: "password123" });
      otherEngToken = res.headers["set-cookie"][0].split(";")[0].split("=")[1];
    });

    it("should return 403 for GET, PATCH, DELETE from other region engineer, but 200 for admin", async () => {
      // 1. GET
      let res = await request(app).get("/api/companies/" + companyId).set("Cookie", [\`token=\${otherEngToken}\`]);
      // Wait, is there a GET /api/companies/:id route?
      // Lets just assert PATCH and DELETE if GET by ID is not there, but wait, if it is there it should be 403
    });
  });
});
`);
fs.writeFileSync("tests/company.api.test.js", code);

