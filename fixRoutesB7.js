
const fs = require("fs");
let r = fs.readFileSync("src/routes/adminCompanyRoutes.js", "utf8");
r = r.replace(/const \{ mergeCompanies \} = require\("\.\.\/controllers\/companyController"\);/, "const { mergeCompanies, importCompanies } = require(\"../controllers/companyController\");\nconst multer = require(\"multer\");\nconst upload = multer({ dest: \"uploads/\" });");
r = r.replace(/router\.post\("\/:id\/merge", mergeCompanies\);/, "router.post(\"/:id/merge\", mergeCompanies);\nrouter.post(\"/import\", upload.single(\"file\"), importCompanies);");
fs.writeFileSync("src/routes/adminCompanyRoutes.js", r);

