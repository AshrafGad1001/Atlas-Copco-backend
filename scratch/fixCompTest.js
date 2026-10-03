
const fs = require("fs");
let code = fs.readFileSync("tests/company.api.test.js", "utf8");
code = code.replace(
  "const resGet = await request(app).get(\"/api/companies/\" + companyId + \"/history\").set(\"Cookie\", [`token=${otherEngToken}`]);",
  "const resGet = await request(app).get(\"/api/companies/\" + companyId).set(\"Cookie\", [`token=${otherEngToken}`]);\n      expect(resGet.statusCode).toBe(403);\n      const resGetHist = await request(app).get(\"/api/companies/\" + companyId + \"/history\").set(\"Cookie\", [`token=${otherEngToken}`]);"
);
code = code.replace("expect(resGet.statusCode).toBe(403);", "expect(resGetHist.statusCode).toBe(403);");
fs.writeFileSync("tests/company.api.test.js", code);

