
const fs = require("fs");
let r = fs.readFileSync("src/routes/companyRoutes.js", "utf8");
r = r.replace(/authorize\("admin"\)/, "restrictTo(\"admin\")");
r = r.replace(/require\("\.\.\/middlewares\/authMiddleware"\)\.restrictTo/, "require(\"../middlewares/authMiddleware\").restrictTo"); // already done?
fs.writeFileSync("src/routes/companyRoutes.js", r);

