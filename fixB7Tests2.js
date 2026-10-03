
const fs = require("fs");
let t = fs.readFileSync("tests/company.api.test.js", "utf8");
t = t.replace(/if \(fs\.existsSync\(testExcel\)\)/, "const fs = require(\"fs\");\n    if (fs.existsSync(testExcel))");
fs.writeFileSync("tests/company.api.test.js", t);

