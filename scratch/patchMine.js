
const fs = require("fs");
let c = fs.readFileSync("scratch/test-visits.js", "utf8");
c = c.replace(/console\.log\(res\.body\.data\.length === 0 \? \"YES\" : \"NO\"\);/, "console.log(res.status, res.body);");
fs.writeFileSync("scratch/test-visits.js", c);

