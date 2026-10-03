
const fs = require("fs");
let code = fs.readFileSync("tests/company.api.test.js", "utf8");
code = code.replace(/name: "Reg1"/g, "name: \"Region 1\"");
code = code.replace(/name: "Reg2"/g, "name: \"Region 2\"");
fs.writeFileSync("tests/company.api.test.js", code);

