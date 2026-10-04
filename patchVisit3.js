
const fs = require("fs");
let c = fs.readFileSync("src/models/Visit.js", "utf8");
c = c.replace(/    \}\],\r?\n    isDeleted:/, "    }],\n    validate: [v => v.length <= 10, \"???? ?????? 10 ??????\"]\n  },\n    isDeleted:");
fs.writeFileSync("src/models/Visit.js", c);

