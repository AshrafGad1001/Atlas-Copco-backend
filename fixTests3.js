
const fs = require("fs");
let t = fs.readFileSync("tests/company.api.test.js", "utf8");
t = t.replace(/\\\\u/g, "\\u");
fs.writeFileSync("tests/company.api.test.js", t);

