
const fs = require("fs");
let c = fs.readFileSync("src/controllers/companyController.js", "utf8");

const importLogic = `
const exceljs = require("exceljs");
const normalizeName = require("../utils/normalizeName");
const Region = require("../models/Region");

exports.importCompanies = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "\\u0627\\u0644\\u0645\\u0644\\u0641 \\u0645\\u0637\\u0644\\u0648\\u0628" });
  if (req.file.size > 2 * 1024 * 1024) return res.status(400).json({ success: false, message: "\\u0627\\u0644\\u0645\\u0644\\u0641 \\u0623\\u0643\\u0628\\u0631 \\u0645\\u0646 2 \\u0645\\u064a\\u062c\\u0627" });

  const workbook = new exceljs.Workbook();
  await workbook.xlsx.readFile(req.file.path);
  const sheet = workbook.worksheets[0];
  if (!sheet) return res.status(400).json({ success: false, message: "\\u0627\\u0644\\u0645\\u0644\\u0641 \\u0641\\u0627\\u0631\\u063a" });

  const rowCount = sheet.actualRowCount;
  if (rowCount > 2001) return res.status(400).json({ success: false, message: "\\u0627\\u0644\\u062d\\u062f \\u0627\\u0644\\u0623\\u0642\\u0635\\u0649 2000 \\u0635\\u0641" });

  const regions = await Region.find().lean();
  const regionMap = {};
  for (const r of regions) regionMap[r.name.trim()] = r._id;

  const toInsert = [];
  let ignored = 0;
  
  const inMemorySetAr = new Set();
  const inMemorySetEn = new Set();

  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    const rowValues = row.values;
    if (!rowValues || !rowValues.length) continue;

    const nameAr = row.getCell(1).text?.trim();
    const nameEn = row.getCell(2).text?.trim();
    const regionName = row.getCell(3).text?.trim();
    const address = row.getCell(4).text?.trim();
    const industry = row.getCell(5).text?.trim();
    const notes = row.getCell(6).text?.trim();

    if (!nameAr && !nameEn) { ignored++; continue; }
    if (!regionName || !regionMap[regionName]) { ignored++; continue; }

    const regionId = regionMap[regionName];
    const nameArNorm = nameAr ? normalizeName(nameAr) : "";
    const nameEnNorm = nameEn ? normalizeName(nameEn) : "";

    const keyAr = \`\${nameArNorm}_\${regionId}\`;
    const keyEn = \`\${nameEnNorm}_\${regionId}\`;

    if (nameArNorm && inMemorySetAr.has(keyAr)) { ignored++; continue; }
    if (nameEnNorm && inMemorySetEn.has(keyEn)) { ignored++; continue; }

    const queryOr = [];
    if (nameArNorm) queryOr.push({ nameArNorm });
    if (nameEnNorm) queryOr.push({ nameEnNorm });

    const exists = await Company.findOne({ region: regionId, isDeleted: false, $or: queryOr }).lean();
    if (exists) { ignored++; continue; }

    if (nameArNorm) inMemorySetAr.add(keyAr);
    if (nameEnNorm) inMemorySetEn.add(keyEn);

    toInsert.push({ nameAr, nameEn, region: regionId, address, industry, notes });
  }

  if (toInsert.length > 0) {
    await Company.insertMany(toInsert);
  }
  
  // require fs to delete file
  const fs = require("fs");
  fs.unlinkSync(req.file.path);

  res.status(200).json({ success: true, data: { added: toInsert.length, ignored } });
});
`;

c = c.replace(/exports\.companySchema =/, importLogic + "\nexports.companySchema =");
fs.writeFileSync("src/controllers/companyController.js", c);

