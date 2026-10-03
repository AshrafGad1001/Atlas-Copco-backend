
const fs = require("fs");
let code = fs.readFileSync("tests/company.api.test.js", "utf8");
code = code.replace(/reg2\._id/g, "otherRegionId");
code = code.replace(/reg1\._id/g, "engRegionId");
fs.writeFileSync("tests/company.api.test.js", code);

