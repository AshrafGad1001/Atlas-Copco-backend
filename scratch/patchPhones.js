
const fs = require("fs");
let c = fs.readFileSync("scratch/test-visits.js", "utf8");
c = c.replace(/role: "engineer", region: reg1\._id \}/, "role: \"engineer\", region: reg1._id, phones: [{ number: \"01011111111\" }] }");
c = c.replace(/role: "engineer", region: reg2\._id \}/, "role: \"engineer\", region: reg2._id, phones: [{ number: \"01022222222\" }] }");
fs.writeFileSync("scratch/test-visits.js", c);

