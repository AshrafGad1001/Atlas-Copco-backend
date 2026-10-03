
const fs = require("fs");
let c = fs.readFileSync("src/controllers/companyController.js", "utf8");
c = c.replace(/exports\.companySchema = z\.object\(\{[\s\S]*?\}\);/, 
  `exports.companySchema = z.object({
  nameAr: z.string().optional(),
  nameEn: z.string().optional(),
  region: z.string().min(1, "\\u0627\\u0644\\u0645\\u0646\\u0637\\u0642\\u0629 \\u0645\\u0637\\u0644\\u0648\\u0628\\u0629"),
  address: z.string().optional(),
  industry: z.string().optional(),
  notes: z.string().optional(),
}).refine(data => data.nameAr || data.nameEn, {
  message: "\\u064a\\u062c\\u0628 \\u0625\\u062f\\u062e\\u0627\\u0644 \\u0627\\u0644\\u0627\\u0633\\u0645 \\u0628\\u0627\\u0644\\u0639\\u0631\\u0628\\u064a\\u0629 \\u0623\\u0648 \\u0627\\u0644\\u0625\\u0646\\u062c\\u0644\\u064a\\u0632\\u064a\\u0629",
  path: ["nameAr"]
});`);
fs.writeFileSync("src/controllers/companyController.js", c);

