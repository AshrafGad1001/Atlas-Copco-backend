
const fs = require("fs");
let c = fs.readFileSync("src/controllers/companyController.js", "utf8");
c = c.replace(/exports\.deleteCompany = asyncHandler\(async \(req, res\) => \{[\s\S]*?const normalizeArabic =/g, `exports.deleteCompany = asyncHandler(async (req, res) => {
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

const normalizeArabic =`);
fs.writeFileSync("src/controllers/companyController.js", c);

