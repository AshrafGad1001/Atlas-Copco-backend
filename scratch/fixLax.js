
const fs = require("fs");
let auth = fs.readFileSync("src/controllers/authController.js", "utf8");
auth = auth.replace("sameSite: process.env.NODE_ENV === \"production\" ? \"none\" : \"lax\",", "sameSite: \"lax\",\n    path: \"/\",");
fs.writeFileSync("src/controllers/authController.js", auth);

let gen = fs.readFileSync("src/utils/generateToken.js", "utf8");
gen = gen.replace("sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',", "sameSite: \"lax\",\n    path: \"/\",");
fs.writeFileSync("src/utils/generateToken.js", gen);

