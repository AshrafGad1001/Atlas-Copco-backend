
const fs = require("fs");
let p = fs.readFileSync("package.json", "utf8");
let pkg = JSON.parse(p);
pkg.scripts["backfill:company-keys"] = "node scripts/backfill-company-keys.js";
fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2));

let c = fs.readFileSync("tests/company.api.test.js", "utf8");
c = c.replace(/name:/g, "nameAr:");
c = c.replace(/phones: \[ \{ number: .01012345678. \} \]/g, "industry: \"Test\"");
c = c.replace(/address:/g, "address:"); // just touching
c = c.replace(/app\.put/g, "app.patch");
fs.writeFileSync("tests/company.api.test.js", c);

