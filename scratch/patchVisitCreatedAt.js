
const fs = require("fs");
let c = fs.readFileSync("scratch/test-visits.js", "utf8");
c = c.replace(/await Visit\.updateOne\(\{ _id: visitId \}, \{ createdAt: new Date\(Date\.now\(\) - 25 \* 3600000\) \}\);/, "await Visit.collection.updateOne({ _id: new mongoose.Types.ObjectId(visitId) }, { $set: { createdAt: new Date(Date.now() - 25 * 3600000) } });");
fs.writeFileSync("scratch/test-visits.js", c);

