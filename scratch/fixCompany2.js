
const fs = require("fs");
let code = fs.readFileSync("tests/company.api.test.js", "utf8");
code = code.replace(/name: "Hacked", phone: "01000000000", isClient: true \}/g, "name: \"Hacked\", region: reg2._id, phone: \"01000000000\", isClient: true }");
code = code.replace(/name: "Admin Edited", phone: "01000000000", isClient: true \}/g, "name: \"Admin Edited\", region: reg1._id, phone: \"01000000000\", isClient: true }");
fs.writeFileSync("tests/company.api.test.js", code);

