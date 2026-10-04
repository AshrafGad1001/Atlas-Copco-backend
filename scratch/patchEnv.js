
const fs = require("fs");
let c = fs.readFileSync("scratch/test-visits.js", "utf8");
c = c.replace("../.env", ".env");
fs.writeFileSync("scratch/test-visits.js", c);

