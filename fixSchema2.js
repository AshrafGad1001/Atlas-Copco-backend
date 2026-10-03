
const fs = require("fs");
let c = fs.readFileSync("src/controllers/companyController.js", "utf8");
c = c.replace(/exports\.companySchema = z\.object\(\{[\s\S]*?\}\.refine[\s\S]*?\}\);/, 
`const baseSchema = z.object({
  nameAr: z.string().optional(),
  nameEn: z.string().optional(),
  region: z.string().min(1, "\\u0627\\u0644\\u0645\\u0646\\u0637\\u0642\\u0629 \\u0645\\u0637\\u0644\\u0648\\u0628\\u0629"),
  address: z.string().optional(),
  industry: z.string().optional(),
  notes: z.string().optional(),
});
exports.companySchema = baseSchema.refine(data => data.nameAr || data.nameEn, {
  message: "\\u064a\\u062c\\u0628 \\u0625\\u062f\\u062e\\u0627\\u0644 \\u0627\\u0644\\u0627\\u0633\\u0645 \\u0628\\u0627\\u0644\\u0639\\u0631\\u0628\\u064a\\u0629 \\u0623\\u0648 \\u0627\\u0644\\u0625\\u0646\\u062c\\u0644\\u064a\\u0632\\u064a\\u0629",
  path: ["nameAr"]
});
exports.updateCompanySchema = baseSchema.partial().refine(data => {
  if (data.nameAr !== undefined || data.nameEn !== undefined) {
    return data.nameAr || data.nameEn;
  }
  return true;
}, {
  message: "\\u064a\\u062c\\u0628 \\u0625\\u062f\\u062e\\u0627\\u0644 \\u0627\\u0644\\u0627\\u0633\\u0645",
  path: ["nameAr"]
});`);
fs.writeFileSync("src/controllers/companyController.js", c);

let r = fs.readFileSync("src/routes/companyRoutes.js", "utf8");
r = r.replace(/\(req, res, next\) => validate\(.*?\)\[\s\S\]*/g, ""); // revert the dirty fix
// wait, I can just replace the whole file routes
fs.writeFileSync("src/routes/companyRoutes.js", `
const express = require("express");
const { createCompany, getCompanies, updateCompany, deleteCompany, companySchema, updateCompanySchema, getCompanyAttendees, getCompanyHistory } = require("../controllers/companyController");
const { protect } = require("../middlewares/authMiddleware");
const validate = require("../middlewares/validate");

const router = express.Router();

router.use(protect);

router.route("/")
  .post(validate(companySchema), createCompany)
  .get(getCompanies);

router.route("/:id/attendees")
  .get(getCompanyAttendees);

router.route("/:id/history")
  .get(getCompanyHistory);

router.route("/:id")
  .patch(validate(updateCompanySchema), updateCompany)
  .delete(deleteCompany);

module.exports = router;
`);

