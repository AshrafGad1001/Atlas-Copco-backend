const { z } = require('zod');
const Company = require('../models/Company');
const asyncHandler = require('../utils/asyncHandler');

exports.companySchema = z.object({
  name: z.string().min(2, 'اسم الشركة مطلوب'),
  region: z.string().min(1, 'المنطقة مطلوبة'),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
  phones: z.array(z.object({ number: z.string() })).optional()
});

exports.createCompany = asyncHandler(async (req, res) => {
  const company = await Company.create(req.body);
  res.status(201).json({ success: true, data: company });
});

exports.getCompanies = asyncHandler(async (req, res) => {
  // If engineer, they might want to see companies in their region only, 
  // but let's just allow filtering by region
  const filter = {};
  if (req.query.region) {
    filter.region = req.query.region;
  }
  const companies = await Company.find(filter).populate('region', 'name');
  res.status(200).json({ success: true, data: companies });
});

exports.updateCompany = asyncHandler(async (req, res) => {
  const company = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!company) {
    return res.status(404).json({ success: false, message: 'الشركة غير موجودة' });
  }
  res.status(200).json({ success: true, data: company });
});

exports.deleteCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) {
    return res.status(404).json({ success: false, message: 'الشركة غير موجودة' });
  }
  await company.deleteOne();
  res.status(200).json({ success: true, message: 'تم الحذف' });
});
