
const fs = require("fs");
let code = fs.readFileSync("tests/visit.api.test.js", "utf8");
code = code.replace(/await Region\.findOne\(\{ name: "Region 1" \}\);/g, "engRegionId");
code = code.replace(/await Region\.findOne\(\{ name: "Region 2" \}\);/g, "otherRegionId");
code = code.replace(/reg1\._id/g, "engRegionId");
code = code.replace(/reg2\._id/g, "otherRegionId");
fs.writeFileSync("tests/visit.api.test.js", code);

let code2 = fs.readFileSync("tests/history.report.test.js", "utf8");
code2 = code2.replace(/const reg1 = await Region\.findOne\(\{ name: "Region 1" \}\);\n\s+const reg2 = await Region\.findOne\(\{ name: "Region 2" \}\);\n\s+reg1_id = reg1\._id;/, "");
code2 = code2.replace(/reg1\._id/g, "engRegionId");
code2 = code2.replace(/reg2\._id/g, "otherRegionId");
code2 = code2.replace(/reg1_id/g, "engRegionId");
code2 = code2.replace(/phones:\[\{number:"123"\}\]/g, "phones:[{number:\"01000000000\"}]");
code2 = code2.replace(/User\.create\(\{ fullName: "Eng A Exp", username: "eng.a.exp", password: "password123", role: "engineer", region: engRegionId, phones:\[\{number:"01000000000"\}\] \}\)/g, "User.create({ fullName: \"Eng A Exp\", username: \"eng.a.exp\", email: \"a@exp.com\", password: \"password123\", role: \"engineer\", region: engRegionId, phones:[{number:\"01000000000\"}] })");
code2 = code2.replace(/User\.create\(\{ fullName: "Eng B Exp", username: "eng.b.exp", password: "password123", role: "engineer", region: otherRegionId, phones:\[\{number:"01000000000"\}\] \}\)/g, "User.create({ fullName: \"Eng B Exp\", username: \"eng.b.exp\", email: \"b@exp.com\", password: \"password123\", role: \"engineer\", region: otherRegionId, phones:[{number:\"01000000000\"}] })");
code2 = code2.replace(/User\.create\(\{ fullName: "Admin Exp", username: "admin.exp", password: "password123", role: "admin", phones:\[\{number:"01000000000"\}\] \}\)/g, "User.create({ fullName: \"Admin Exp\", username: \"admin.exp\", email: \"admin@exp.com\", password: \"password123\", role: \"admin\", phones:[{number:\"01000000000\"}] })");

fs.writeFileSync("tests/history.report.test.js", code2);

