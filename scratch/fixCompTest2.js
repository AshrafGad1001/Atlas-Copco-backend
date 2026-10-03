
const fs = require("fs");
let code = fs.readFileSync("tests/company.api.test.js", "utf8");
code = code.replace("expect(resGetHist.statusCode).toBe(403);\n      const resGetHist", "expect(resGet.statusCode).toBe(403);\n      const resGetHist");
fs.writeFileSync("tests/company.api.test.js", code);

