
const fs = require("fs");
let c = fs.readFileSync("src/models/Company.js", "utf8");
c = c.replace(/companySchema\.pre\(\[.+?\][\s\S]+?\}\);/g, `companySchema.pre(["updateOne", "findOneAndUpdate", "updateMany"], function() {
  const update = this.getUpdate();
  if (!update) return;
  const newUpdate = { ...update };
  if (newUpdate.$set) {
    if (newUpdate.$set.nameAr !== undefined) newUpdate.$set.nameArNorm = require("../utils/normalizeName")(newUpdate.$set.nameAr);
    if (newUpdate.$set.nameEn !== undefined) newUpdate.$set.nameEnNorm = require("../utils/normalizeName")(newUpdate.$set.nameEn);
  } else {
    if (newUpdate.nameAr !== undefined) newUpdate.nameArNorm = require("../utils/normalizeName")(newUpdate.nameAr);
    if (newUpdate.nameEn !== undefined) newUpdate.nameEnNorm = require("../utils/normalizeName")(newUpdate.nameEn);
  }
  this.setUpdate(newUpdate);
});`);
fs.writeFileSync("src/models/Company.js", c);

