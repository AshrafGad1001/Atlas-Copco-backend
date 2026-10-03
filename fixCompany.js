
const fs = require("fs");
let c = fs.readFileSync("src/models/Company.js", "utf8");
c = c.replace(/companySchema\.pre\(\["updateOne"[\s\S]+?\}\);/, "");
fs.writeFileSync("src/models/Company.js", c);

let t = fs.readFileSync("tests/company.api.test.js", "utf8");
t = t.replace(/console\.log\([^)]+\);/g, "");
fs.writeFileSync("tests/company.api.test.js", t);

