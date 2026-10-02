const fs = require('fs');

// Patch companyController
let c = fs.readFileSync('src/controllers/companyController.js', 'utf8');

c = c.replace(
  /exports\.createCompany = asyncHandler\(async \(req, res\) => \{[\s\S]*?res\.status\(201\)\.json\(\{ success: true, data: company \}\);\n\}\);/,
  `exports.createCompany = asyncHandler(async (req, res) => {
  if (req.user.role === 'engineer') {
    req.body.region = req.user.region;
  }
  const company = await Company.create(req.body);
  res.status(201).json({ success: true, data: company });
});`
);

c = c.replace(
  /exports\.getCompanies = asyncHandler\(async \(req, res\) => \{[\s\S]*?res\.status\(200\)\.json\(\{ success: true, data: companies \}\);\n\}\);/,
  `exports.getCompanies = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'engineer') {
    filter.region = req.user.region;
  } else if (req.query.region) {
    filter.region = req.query.region;
  }
  const companies = await Company.find(filter).populate('region', 'name');
  res.status(200).json({ success: true, data: companies });
});`
);

c = c.replace(
  /exports\.updateCompany = asyncHandler\(async \(req, res\) => \{[\s\S]*?res\.status\(200\)\.json\(\{ success: true, data: company \}\);\n\}\);/,
  `exports.updateCompany = asyncHandler(async (req, res) => {
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
  
  const updated = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  res.status(200).json({ success: true, data: updated });
});`
);

c = c.replace(
  /exports\.deleteCompany = asyncHandler\(async \(req, res\) => \{[\s\S]*?res\.status\(200\)\.json\(\{ success: true, message: .*? \}\);\n\}\);/,
  `exports.deleteCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) {
    return res.status(404).json({ success: false, message: 'الشركة غير موجودة' });
  }
  if (req.user.role === 'engineer' && company.region.toString() !== req.user.region.toString()) {
    return res.status(403).json({ success: false, message: 'غير مصرح' });
  }
  await company.deleteOne();
  res.status(200).json({ success: true, message: 'تم الحذف' });
});`
);

fs.writeFileSync('src/controllers/companyController.js', c);


// Patch visitController
let v = fs.readFileSync('src/controllers/visitController.js', 'utf8');

v = v.replace(
  /exports\.createVisit = asyncHandler\(async \(req, res\) => \{[\s\S]*?res\.status\(201\)\.json\(\{ success: true, data: visit \}\);\n\}\);/,
  `exports.createVisit = asyncHandler(async (req, res) => {
  if (req.user.role === 'engineer') {
    req.body.engineer = req.user._id;
  }
  
  const Company = require('../models/Company');
  const company = await Company.findById(req.body.company);
  if (!company) return res.status(404).json({ success: false, message: 'الشركة غير موجودة' });
  
  if (req.user.role === 'engineer' && company.region.toString() !== req.user.region.toString()) {
    return res.status(403).json({ success: false, message: 'غير مصرح' });
  }

  const visitData = { ...req.body };
  const visit = await Visit.create(visitData);
  res.status(201).json({ success: true, data: visit });
});`
);

v = v.replace(
  /exports\.getVisits = asyncHandler\(async \(req, res\) => \{[\s\S]*?res\.status\(200\)\.json\(\{ success: true, data: visits \}\);\n\}\);/,
  `exports.getVisits = asyncHandler(async (req, res) => {
  const filter = { isDeleted: { $ne: true } };
  
  if (req.user.role === 'engineer') {
    filter.engineer = req.user._id;
  }
  
  if (req.query.company) filter.company = req.query.company;

  const visits = await Visit.find(filter)
    .populate('company', 'name')
    .populate('engineer', 'fullName')
    .sort('-visitDate');
    
  res.status(200).json({ success: true, data: visits });
});`
);

v = v.replace(
  /exports\.updateVisit = asyncHandler\(async \(req, res\) => \{[\s\S]*?res\.status\(200\)\.json\(\{ success: true, data: updated \}\);\n\}\);/,
  `exports.updateVisit = asyncHandler(async (req, res) => {
  const visit = await Visit.findById(req.params.id);
  if (!visit || visit.isDeleted) {
    return res.status(404).json({ success: false, message: 'الزيارة غير موجودة' });
  }

  if (req.user.role === 'engineer' && visit.engineer.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'لا يمكنك تعديل زيارة مهندس آخر' });
  }

  const hoursDiff = (Date.now() - visit.createdAt.getTime()) / (1000 * 60 * 60);
  if (hoursDiff > 24) {
    return res.status(403).json({ success: false, message: 'لا يمكن تعديل الزيارة بعد مرور 24 ساعة' });
  }
  
  if (req.user.role === 'engineer') {
    req.body.engineer = req.user._id;
  }

  const updated = await Visit.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  res.status(200).json({ success: true, data: updated });
});`
);

v = v.replace(
  /exports\.deleteVisit = asyncHandler\(async \(req, res\) => \{[\s\S]*?res\.status\(200\)\.json\(\{ success: true, message: .*? \}\);\n\}\);/,
  `exports.deleteVisit = asyncHandler(async (req, res) => {
  const visit = await Visit.findById(req.params.id);
  if (!visit || visit.isDeleted) {
    return res.status(404).json({ success: false, message: 'الزيارة غير موجودة' });
  }
  
  if (req.user.role === 'engineer' && visit.engineer.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'غير مصرح' });
  }

  visit.isDeleted = true;
  await visit.save();
  res.status(200).json({ success: true, message: 'تم الحذف بنجاح' });
});`
);

fs.writeFileSync('src/controllers/visitController.js', v);
