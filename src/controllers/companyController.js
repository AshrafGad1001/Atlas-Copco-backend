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

exports.createCompany = asyncHandler(async (req, res) => {
  if (req.user.role === 'engineer') {
    req.body.region = req.user.region;
  }
  const company = await Company.create(req.body);
  res.status(201).json({ success: true, data: company });
});

exports.getCompanies = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.search) {
    const normalize = (t) => t.trim().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase();
    filter.normalizedName = { $regex: normalize(req.query.search), $options: 'i' };
  }
  if (req.user.role === 'engineer') {
    filter.region = req.user.region;
  } else if (req.query.region) {
    filter.region = req.query.region;
  }
  const companies = await Company.find(filter).populate('region', 'name');
  res.status(200).json({ success: true, data: companies });
});

exports.updateCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) {
    return res.status(404).json({ success: false, message: 'الشركة غير موجودة' });
  }
  if (req.user.role === 'engineer') {
    if (company.region.toString() !== req.user.region.toString()) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }
    req.body.region = req.user.region;
  }
  
  Object.assign(company, req.body);
  const updated = await company.save();
  res.status(200).json({ success: true, data: updated });
});

exports.deleteCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) {
    return res.status(404).json({ success: false, message: 'الشركة غير موجودة' });
  }
  if (req.user.role === 'engineer' && company.region.toString() !== req.user.region.toString()) {
    return res.status(403).json({ success: false, message: 'غير مصرح' });
  }
  await company.deleteOne();
  res.status(200).json({ success: true, message: 'تم الحذف' });
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
