
const fs = require("fs");
let c = fs.readFileSync("src/controllers/companyController.js", "utf8");
c = c.replace(/exports\.getCompanies = asyncHandler\([\s\S]*?\}\);/, `exports.getCompanies = asyncHandler(async (req, res) => {
  const filter = { isDeleted: false };
  if (req.query.search) {
    const normalizeName = require("../utils/normalizeName");
    const escapeRegex = require("../utils/escapeRegex");
    const q = normalizeName(req.query.search);
    if (q) {
      const regex = new RegExp(escapeRegex(q), "i");
      filter.$or = [
        { nameArNorm: regex },
        { nameEnNorm: regex }
      ];
    }
  }
  if (req.user.role === "engineer") {
    filter.region = req.user.region;
  } else if (req.query.region) {
    filter.region = req.query.region;
  }
  const page = parseInt(req.query.page, 10) || 1;
  let limit = parseInt(req.query.limit, 10) || 20;
  if (limit > 50) limit = 50;
  const skip = (page - 1) * limit;

  const total = await Company.countDocuments(filter);
  const companies = await Company.find(filter)
    .populate("region", "name")
    .sort({ nameAr: 1, nameEn: 1 })
    .skip(skip)
    .limit(limit)
    .lean();
    
  res.status(200).json({ 
    success: true, 
    data: companies,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
});`);
fs.writeFileSync("src/controllers/companyController.js", c);

