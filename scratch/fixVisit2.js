
const fs = require("fs");
let code = fs.readFileSync("tests/visit.api.test.js", "utf8");
code = code.replace(/phones:\[\{number:"123"\}\]/g, "phones:[{number:\"01000000000\"}]");
code = code.replace(/fullName: "Eng A", username: "eng.a",/g, "fullName: \"Eng A\", username: \"eng.a\", email: \"a@test.com\",");
code = code.replace(/fullName: "Eng C", username: "eng.c",/g, "fullName: \"Eng C\", username: \"eng.c\", email: \"c@test.com\",");
code = code.replace(/fullName: "Eng B", username: "eng.b",/g, "fullName: \"Eng B\", username: \"eng.b\", email: \"b@test.com\",");
fs.writeFileSync("tests/visit.api.test.js", code);

