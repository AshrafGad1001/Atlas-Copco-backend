
const fs = require("fs");
let c = fs.readFileSync("src/controllers/companyController.js", "utf8");
c = c.replace(/  \}\);\n\nexports\.updateCompany/g, "  });\n});\n\nexports.updateCompany");
fs.writeFileSync("src/controllers/companyController.js", c);

