
const fs = require("fs");
let c = fs.readFileSync("src/controllers/companyController.js", "utf8");

const mergeLogic = `
exports.mergeCompanies = asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  const { sourceIds } = req.body;
  if (!Array.isArray(sourceIds) || sourceIds.length === 0) {
    return res.status(400).json({ success: false, message: "sourceIds is required" });
  }

  const target = await Company.findById(targetId);
  if (!target) return res.status(404).json({ success: false, message: "\\u0627\\u0644\\u0634\\u0631\\u0643\\u0629 \\u063a\\u064a\\u0631 \\u0645\\u0648\\u062c\\u0648\\u062f\\u0629" });

  const sources = await Company.find({ _id: { $in: sourceIds } });

  for (const source of sources) {
    if (!target.nameEn && source.nameEn) target.nameEn = source.nameEn;
    if (!target.address && source.address) target.address = source.address;
    if (!target.industry && source.industry) target.industry = source.industry;
    if (!target.notes && source.notes) target.notes = source.notes;
    
    source.isDeleted = true;
    await source.save();
  }
  
  await target.save();
  await Visit.updateMany({ company: { $in: sourceIds } }, { $set: { company: target._id } });

  res.status(200).json({ success: true, data: target, message: "\\u062a\\u0645 \\u0627\\u0644\\u062f\\u0645\\u062c \\u0628\\u0646\\u062c\\u0627\\u062d" });
});
`;

c = c.replace(/exports\.companySchema =/, mergeLogic + "\nexports.companySchema =");
fs.writeFileSync("src/controllers/companyController.js", c);

let r = fs.readFileSync("src/routes/companyRoutes.js", "utf8");
r = r.replace(/const \{ createCompany, getCompanies, updateCompany, deleteCompany, companySchema, updateCompanySchema, getCompanyAttendees, getCompanyHistory \} = require\("\.\.\/controllers\/companyController"\);/, "const { createCompany, getCompanies, updateCompany, deleteCompany, companySchema, updateCompanySchema, getCompanyAttendees, getCompanyHistory, mergeCompanies } = require(\"../controllers/companyController\");");

r = r.replace(/module\.exports = router;/, `
router.route("/:id/merge")
  .post(require("../middlewares/authMiddleware").authorize("admin"), mergeCompanies);

module.exports = router;
`);
fs.writeFileSync("src/routes/companyRoutes.js", r);

