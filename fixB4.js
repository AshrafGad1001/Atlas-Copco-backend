
const fs = require("fs");
let c = fs.readFileSync("src/controllers/companyController.js", "utf8");

const checkCode = `
async function checkDuplicatesLogic(nameAr, nameEn, regionId, excludeId, confirmSimilar, Company) {
  const normalizeName = require("../utils/normalizeName");
  const nameArNorm = nameAr ? normalizeName(nameAr) : "";
  const nameEnNorm = nameEn ? normalizeName(nameEn) : "";

  const query = { isDeleted: false, region: regionId };
  if (excludeId) query._id = { $ne: excludeId };

  const companies = await Company.find(query).select("nameArNorm nameEnNorm nameAr nameEn").lean();
  
  let duplicate = null;
  let similar = null;

  for (const comp of companies) {
    if (nameArNorm && comp.nameArNorm === nameArNorm) { duplicate = comp; break; }
    if (nameEnNorm && comp.nameEnNorm === nameEnNorm) { duplicate = comp; break; }
    
    if (nameArNorm && comp.nameArNorm && (comp.nameArNorm.includes(nameArNorm) || nameArNorm.includes(comp.nameArNorm))) { similar = comp; }
    if (nameEnNorm && comp.nameEnNorm && (comp.nameEnNorm.includes(nameEnNorm) || nameEnNorm.includes(comp.nameEnNorm))) { similar = comp; }
  }

  if (duplicate) return { code: "DUPLICATE", company: duplicate };
  if (similar && String(confirmSimilar) !== "true") return { code: "SIMILAR_EXISTS", company: similar };
  return null;
}
`;

c = c.replace(/exports\.createCompany = asyncHandler\(async \(req, res\) => \{/, 
checkCode + `
exports.createCompany = asyncHandler(async (req, res) => {
  if (req.user.role === "engineer") {
    req.body.region = req.user.region;
  }
  const dupCheck = await checkDuplicatesLogic(req.body.nameAr, req.body.nameEn, req.body.region, null, req.query.confirmSimilar, Company);
  if (dupCheck) {
    return res.status(409).json({ success: false, message: dupCheck.code === "DUPLICATE" ? "\\u0634\\u0631\\u0643\\u0629 \\u0645\\u0643\\u0631\\u0631\\u0629" : "\\u0634\\u0631\\u0643\\u0629 \\u0645\\u0634\\u0627\\u0628\\u0647\\u0629 \\u0645\\u0648\\u062c\\u0648\\u062f\\u0629", code: dupCheck.code, data: dupCheck.company });
  }
`);

c = c.replace(/Object\.assign\(company, req\.body\);/, `
  const newNameAr = req.body.nameAr !== undefined ? req.body.nameAr : company.nameAr;
  const newNameEn = req.body.nameEn !== undefined ? req.body.nameEn : company.nameEn;
  const dupCheck = await checkDuplicatesLogic(newNameAr, newNameEn, company.region, company._id, req.query.confirmSimilar, Company);
  if (dupCheck) {
    return res.status(409).json({ success: false, message: dupCheck.code === "DUPLICATE" ? "\\u0634\\u0631\\u0643\\u0629 \\u0645\\u0643\\u0631\\u0631\\u0629" : "\\u0634\\u0631\\u0643\\u0629 \\u0645\\u0634\\u0627\\u0628\\u0647\\u0629 \\u0645\\u0648\\u062c\\u0648\\u062f\\u0629", code: dupCheck.code, data: dupCheck.company });
  }
  Object.assign(company, req.body);
`);

fs.writeFileSync("src/controllers/companyController.js", c);

