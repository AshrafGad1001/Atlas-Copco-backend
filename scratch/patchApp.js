
const fs = require("fs");
let c = fs.readFileSync("scratch/test-visits.js", "utf8");
c = c.replace("../src/app", "../app");
fs.writeFileSync("scratch/test-visits.js", c);

