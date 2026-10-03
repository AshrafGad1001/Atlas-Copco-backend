
const fs = require("fs");
let c = fs.readFileSync("src/controllers/companyController.js", "utf8");
c = c.replace(/const updated = await Company\.findByIdAndUpdate\([\s\S]+?\);/, `Object.assign(company, req.body);\n  const updated = await company.save();`);
fs.writeFileSync("src/controllers/companyController.js", c);

