
const fs = require("fs");
let c = fs.readFileSync("src/controllers/companyController.js", "utf8");
c = c.replace(/exports\.updateCompany = asyncHandler\(async \(req, res\) => \{/g, "exports.updateCompany = asyncHandler(async (req, res) => {\nconsole.log(\"req.body in updateCompany:\", req.body);");
fs.writeFileSync("src/controllers/companyController.js", c);

