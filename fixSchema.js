
const fs = require("fs");
let c = fs.readFileSync("src/controllers/companyController.js", "utf8");
c = c.replace(/notes: z\.string\(\)\.optional\(\),/g, "notes: z.string().optional(),\n  isDeleted: z.boolean().optional(),");
fs.writeFileSync("src/controllers/companyController.js", c);

