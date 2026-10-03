const fs = require("fs");
let c = fs.readFileSync("app.js", "utf8");
c = c.replace(/app\.use\('\/api\/companies', companyRoutes\);/, "app.use('/api/companies', companyRoutes);\napp.use('/api/admin/companies', require('./src/routes/adminCompanyRoutes'));");
fs.writeFileSync("app.js", c);
