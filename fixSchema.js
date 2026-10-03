
const fs = require("fs");
let c = fs.readFileSync("src/controllers/companyController.js", "utf8");
c = c.replace(/validate\(companySchema\)/g, "(req, res, next) => validate(req.method === \"PATCH\" ? exports.companySchema.partial() : exports.companySchema)(req, res, next)");
fs.writeFileSync("src/routes/companyRoutes.js", fs.readFileSync("src/routes/companyRoutes.js", "utf8").replace(/validate\(companySchema\)/g, "(req, res, next) => validate(req.method === \"PATCH\" ? require(\"../controllers/companyController\").companySchema.partial() : require(\"../controllers/companyController\").companySchema)(req, res, next)"));

