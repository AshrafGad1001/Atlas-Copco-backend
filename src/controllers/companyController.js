const { z } = require('zod');
const Company = require('../models/Company');
const Visit = require('../models/Visit');
const asyncHandler = require('../utils/asyncHandler');

const baseSchema = z.object({
  nameAr: z.string().optional(),
  nameEn: z.string().optional(),
  region: z.string().min(1, "\u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0645\u0637\u0644\u0648\u0628\u0629"),
  address: z.string().optional(),
  industry: z.string().optional(),
  notes: z.string().optional(),
  isDeleted: z.boolean().optional(),
});

exports.mergeCompanies = asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  const { sourceIds } = req.body;
  if (!Array.isArray(sourceIds) || sourceIds.length === 0) {
    return res.status(400).json({ success: false, message: "sourceIds is required" });
  }

  const target = await Company.findById(targetId);
  if (!target) return res.status(404).json({ success: false, message: "\u0627\u0644\u0634\u0631\u0643\u0629 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f\u0629" });

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

  res.status(200).json({ success: true, data: target, message: "\u062a\u0645 \u0627\u0644\u062f\u0645\u062c \u0628\u0646\u062c\u0627\u062d" });
});


const exceljs = require("exceljs");
const normalizeName = require("../utils/normalizeName");
const Region = require("../models/Region");

exports.importCompanies = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "\u0627\u0644\u0645\u0644\u0641 \u0645\u0637\u0644\u0648\u0628" });
  if (req.file.size > 2 * 1024 * 1024) return res.status(400).json({ success: false, message: "\u0627\u0644\u0645\u0644\u0641 \u0623\u0643\u0628\u0631 \u0645\u0646 2 \u0645\u064a\u062c\u0627" });

  const workbook = new exceljs.Workbook();
  await workbook.xlsx.readFile(req.file.path);
  const sheet = workbook.worksheets[0];
  if (!sheet) return res.status(400).json({ success: false, message: "\u0627\u0644\u0645\u0644\u0641 \u0641\u0627\u0631\u063a" });

  const rowCount = sheet.actualRowCount;
  if (rowCount > 2001) return res.status(400).json({ success: false, message: "\u0627\u0644\u062d\u062f \u0627\u0644\u0623\u0642\u0635\u0649 2000 \u0635\u0641" });

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

    const keyAr = `${nameArNorm}_${regionId}`;
    const keyEn = `${nameEnNorm}_${regionId}`;

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

  if (req.body.dryRun === "true") {
    const fs = require("fs");
    fs.unlinkSync(req.file.path);
    return res.status(200).json({ success: true, data: { added: toInsert.length, ignored } });
  }

  if (toInsert.length > 0) {
    await Company.insertMany(toInsert);
  }
  
  // require fs to delete file
  const fs = require("fs");
  fs.unlinkSync(req.file.path);

  res.status(200).json({ success: true, data: { added: toInsert.length, ignored } });
});

exports.companySchema = baseSchema.refine(data => data.nameAr || data.nameEn, {
  message: "\u064a\u062c\u0628 \u0625\u062f\u062e\u0627\u0644 \u0627\u0644\u0627\u0633\u0645 \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629 \u0623\u0648 \u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629",
  path: ["nameAr"]
});
exports.updateCompanySchema = baseSchema.partial().refine(data => {
  if (data.nameAr !== undefined || data.nameEn !== undefined) {
    return data.nameAr || data.nameEn;
  }
  return true;
}, {
  message: "\u064a\u062c\u0628 \u0625\u062f\u062e\u0627\u0644 \u0627\u0644\u0627\u0633\u0645",
  path: ["nameAr"]
});


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

exports.createCompany = asyncHandler(async (req, res) => {
  if (req.user.role === "engineer") {
    req.body.region = req.user.region;
  }
  const dupCheck = await checkDuplicatesLogic(req.body.nameAr, req.body.nameEn, req.body.region, null, req.query.confirmSimilar, Company);
  if (dupCheck) {
    return res.status(409).json({ success: false, message: dupCheck.code === "DUPLICATE" ? "\u0634\u0631\u0643\u0629 \u0645\u0643\u0631\u0631\u0629" : "\u0634\u0631\u0643\u0629 \u0645\u0634\u0627\u0628\u0647\u0629 \u0645\u0648\u062c\u0648\u062f\u0629", code: dupCheck.code, data: dupCheck.company });
  }

  if (req.user.role === 'engineer') {
    req.body.region = req.user.region;
  }
  const company = await Company.create(req.body);
  res.status(201).json({ success: true, data: company });
});

exports.getCompanies = asyncHandler(async (req, res) => {
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
});

exports.updateCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) {
    return res.status(404).json({ success: false, message: "\u0627\u0644\u0634\u0631\u0643\u0629 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f\u0629" });
  }
  if (req.user.role === "engineer") {
    if (company.region.toString() !== req.user.region.toString()) {
      return res.status(403).json({ success: false, message: "\u063a\u064a\u0631 \u0645\u0635\u0631\u062d" });
    }
    if (req.body.isDeleted !== undefined) {
      return res.status(403).json({ success: false, message: "\u063a\u064a\u0631 \u0645\u0635\u0631\u062d" });
    }
    delete req.body.region;
  }
  
  const newNameAr = req.body.nameAr !== undefined ? req.body.nameAr : company.nameAr;
  const newNameEn = req.body.nameEn !== undefined ? req.body.nameEn : company.nameEn;
  const dupCheck = await checkDuplicatesLogic(newNameAr, newNameEn, req.body.region || company.region, company._id, req.query.confirmSimilar, Company);
  if (dupCheck) {
    return res.status(409).json({ success: false, message: dupCheck.code === "DUPLICATE" ? "\u0634\u0631\u0643\u0629 \u0645\u0643\u0631\u0631\u0629" : "\u0634\u0631\u0643\u0629 \u0645\u0634\u0627\u0628\u0647\u0629 \u0645\u0648\u062c\u0648\u062f\u0629", code: dupCheck.code, data: dupCheck.company });
  }
  Object.assign(company, req.body);
  const updated = await company.save();
  res.status(200).json({ success: true, data: updated });
});

exports.deleteCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) {
    return res.status(404).json({ success: false, message: "\u0627\u0644\u0634\u0631\u0643\u0629 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f\u0629" });
  }
  if (req.user.role === "engineer") {
    return res.status(403).json({ success: false, message: "\u063a\u064a\u0631 \u0645\u0635\u0631\u062d" });
  }
  company.isDeleted = true;
  await company.save();
  res.status(200).json({ success: true, message: "\u062a\u0645 \u0627\u0644\u062d\u0630\u0641" });
});

const normalizeArabic = (text) => {
  if (!text) return '';
  return text
    .trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');
};

exports.getCompanyAttendees = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) return res.status(404).json({ success: false, message: 'الشركة غير موجودة' });

  if (req.user.role === 'engineer' && company.region.toString() !== req.user.region.toString()) {
    return res.status(403).json({ success: false, message: 'غير مصرح لك بالوصول لشركات خارج منطقتك' });
  }

  // Find all visits for this company
  const visits = await Visit.find({ company: company._id, status: { $ne: 'cancelled' } }) // non-deleted? Wait, Visits don't have isDeleted, maybe status! Wait, "غير المحذوفة". I don't have soft delete yet, but I'll add it in A7 or A4. Let's just do visits for now. 
    .sort('-visitDate')
    .lean();
    
  const uniqueAttendeesMap = new Map();
  
  for (const visit of visits) {
    if (visit.attendees && visit.attendees.length > 0) {
      for (const att of visit.attendees) {
        if (!att.name) continue;
        const normalizedKey = normalizeArabic(att.name);
        
        if (!uniqueAttendeesMap.has(normalizedKey)) {
          uniqueAttendeesMap.set(normalizedKey, {
            name: att.name.trim(), // Keep original name for display
            jobTitle: att.jobTitle || '',
            phone: att.phone || ''
          });
        } else {
          // If already exists, we only take the latest if the current one has empty fields? No, the loop goes from newest to oldest. So the first one we encounter is the newest! So we keep it.
        }
      }
    }
  }

  const attendees = Array.from(uniqueAttendeesMap.values()).slice(0, 20);

  res.status(200).json({ success: true, data: attendees });
});
exports.getCompanyHistory = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) return res.status(404).json({ success: false, message: 'الشركة غير موجودة' });

  if (req.user.role === 'engineer' && company.region.toString() !== req.user.region.toString()) {
    return res.status(403).json({ success: false, message: 'غير مصرح' });
  }

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const visits = await Visit.find({ company: company._id, isDeleted: { $ne: true } })
    .sort('-visitDate')
    .skip(skip)
    .limit(limit)
    .select('visitDate type notes nextStep attendees engineer')
    .populate({
      path: 'engineer',
      select: 'fullName profileImage.url'
    })
    .lean();

  const total = await Visit.countDocuments({ company: company._id, isDeleted: { $ne: true } });

  res.status(200).json({
    success: true,
    data: {
      company,
      visits,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});
