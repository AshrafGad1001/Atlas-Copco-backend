
const fs = require("fs");
let c = fs.readFileSync("src/routes/companyRoutes.js", "utf8");
c = c.replace(/\.put\(/g, ".patch(");
fs.writeFileSync("src/routes/companyRoutes.js", c);

