
const fs = require("fs");
let p = JSON.parse(fs.readFileSync("package.json", "utf8"));
p.scripts.test = "jest --runInBand --testTimeout=10000";
fs.writeFileSync("package.json", JSON.stringify(p, null, 2));

