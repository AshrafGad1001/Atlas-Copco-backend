
const fs = require("fs");
let c = fs.readFileSync("tests/company.api.test.js", "utf8");
c = c.replace(/usernameAr/g, "username");
fs.writeFileSync("tests/company.api.test.js", c);

