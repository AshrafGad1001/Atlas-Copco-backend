
const fs = require("fs");
let c = fs.readFileSync("src/controllers/companyController.js", "utf8");

const updateLogic = `
exports.updateCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) {
    return res.status(404).json({ success: false, message: "\\u0627\\u0644\\u0634\\u0631\\u0643\\u0629 \\u063a\\u064a\\u0631 \\u0645\\u0648\\u062c\\u0648\\u062f\\u0629" });
  }
  if (req.user.role === "engineer") {
    if (company.region.toString() !== req.user.region.toString()) {
      return res.status(403).json({ success: false, message: "\\u063a\\u064a\\u0631 \\u0645\\u0635\\u0631\\u062d" });
    }
    if (req.body.isDeleted !== undefined) {
      return res.status(403).json({ success: false, message: "\\u063a\\u064a\\u0631 \\u0645\\u0635\\u0631\\u062d" });
    }
    // ignore region change
    delete req.body.region;
  }
  
  const newNameAr = req.body.nameAr !== undefined ? req.body.nameAr : company.nameAr;
  const newNameEn = req.body.nameEn !== undefined ? req.body.nameEn : company.nameEn;
  const dupCheck = await checkDuplicatesLogic(newNameAr, newNameEn, req.body.region || company.region, company._id, req.query.confirmSimilar, Company);
  if (dupCheck) {
    return res.status(409).json({ success: false, message: dupCheck.code === "DUPLICATE" ? "\\u0634\\u0631\\u0643\\u0629 \\u0645\\u0643\\u0631\\u0631\\u0629" : "\\u0634\\u0631\\u0643\\u0629 \\u0645\\u0634\\u0627\\u0628\\u0647\\u0629 \\u0645\\u0648\\u062c\\u0648\\u062f\\u0629", code: dupCheck.code, data: dupCheck.company });
  }
  Object.assign(company, req.body);
  const updated = await company.save();
  res.status(200).json({ success: true, data: updated });
});
`;

c = c.replace(/exports\.updateCompany = asyncHandler\(async \(req, res\) => \{[\s\S]*?res\.status\(200\)\.json\(\{ success: true, data: updated \}\);\n\}\);/, updateLogic.trim());

const deleteLogic = `
exports.deleteCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) {
    return res.status(404).json({ success: false, message: "\\u0627\\u0644\\u0634\\u0631\\u0643\\u0629 \\u063a\\u064a\\u0631 \\u0645\\u0648\\u062c\\u0648\\u062f\\u0629" });
  }
  if (req.user.role === "engineer") {
    return res.status(403).json({ success: false, message: "\\u063a\\u064a\\u0631 \\u0645\\u0635\\u0631\\u062d" });
  }
  company.isDeleted = true;
  await company.save();
  res.status(200).json({ success: true, message: "\\u062a\\u0645 \\u0627\\u0644\\u062d\\u0630\\u0641" });
});
`;
c = c.replace(/exports\.deleteCompany = asyncHandler\(async \(req, res\) => \{[\s\S]*?\}\);/, deleteLogic.trim());

fs.writeFileSync("src/controllers/companyController.js", c);

