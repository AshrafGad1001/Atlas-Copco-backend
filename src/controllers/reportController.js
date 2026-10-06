const { buildWorkbook, formatCairoDate, formatCairoTime } = require('../utils/excelBuilder');
const Visit = require('../models/Visit');
const Company = require('../models/Company');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

exports.getStats = asyncHandler(async (req, res) => {
  const totalVisits = await Visit.countDocuments({ isDeleted: { $ne: true } });
  const totalCompanies = await Company.countDocuments();
  const totalEngineers = await User.countDocuments({ role: 'engineer' });
  
  const visitsByStatus = await Visit.aggregate([
    { $match: { isDeleted: { $ne: true } } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalVisits,
      totalCompanies,
      totalEngineers,
      visitsByStatus
    }
  });
});

exports.exportVisitsToExcel = asyncHandler(async (req, res) => {
  const maxRows = parseInt(process.env.EXPORT_MAX_ROWS || '10000', 10);
  
  const filter = { isDeleted: false };
  const isAdmin = req.user.role === 'admin';

  if (isAdmin) {
    if (req.query.engineer) filter.engineer = req.query.engineer;
    if (req.query.company) filter.company = req.query.company;
    if (req.query.type) filter.type = req.query.type;
    
    // admin can filter by region too, requiring a join or we find engineers in region first
    if (req.query.region) {
       const engs = await User.find({ region: req.query.region }).select('_id');
       filter.engineer = { $in: engs.map(e => e._id) };
    }
  } else {
    filter.engineer = req.user._id;
    if (req.query.company) filter.company = req.query.company;
  }

  if (req.query.from || req.query.to) {
    filter.visitDate = {};
    if (req.query.from) filter.visitDate.$gte = new Date(req.query.from);
    if (req.query.to) {
      const toDate = new Date(req.query.to);
      toDate.setHours(23, 59, 59, 999);
      filter.visitDate.$lte = toDate;
    }
  }

  const count = await Visit.countDocuments(filter);
  if (count > maxRows) {
    return res.status(400).json({ success: false, message: 'ضيق الفلاتر' });
  }

  const visits = await Visit.find(filter)
    .populate('company', 'nameAr nameEn region')
    .populate({
      path: 'company',
      populate: { path: 'region', select: 'name' }
    })
    .populate('engineer', 'fullName region')
    .populate({
      path: 'engineer',
      populate: { path: 'region', select: 'name' }
    })
    .sort('-visitDate')
    .lean();

  let columns = [
    { header: 'التاريخ', key: 'date', width: 15 },
    { header: 'الوقت', key: 'time', width: 10 },
    { header: 'الشركة', key: 'company', width: 25 },
    { header: 'نوع الزيارة', key: 'type', width: 15 },
    { header: 'الأشخاص', key: 'attendees', width: 35 },
    { header: 'الملاحظات', key: 'notes', width: 40 },
    { header: 'الخطوة الجاية', key: 'nextStep', width: 30 }
  ];

  if (isAdmin) {
    columns.splice(2, 0, 
      { header: 'المنطقة', key: 'region', width: 20 },
      { header: 'المهندس', key: 'engineer', width: 25 }
    );
  }

  const typeMap = { 'planned': 'مخطط لها', 'completed': 'مكتملة', 'cancelled': 'ملغاة' };

  const rows = visits.map(v => {
    const attendeesStr = (v.attendees || []).map(a => `${a.name || ''} - ${a.jobTitle || ''} - ${a.phone || ''}`).join('\n');
    let row = {
      date: formatCairoDate(v.visitDate),
      time: formatCairoTime(v.visitDate),
      company: `${v.company?.nameAr || ''} ${v.company?.nameEn || ''}`.trim(),
      type: typeMap[v.type] || v.type,
      attendees: attendeesStr,
      notes: v.notes || '',
      nextStep: v.nextStep || ''
    };
    if (isAdmin) {
      row.region = v.engineer?.region?.name || '';
      row.engineer = v.engineer?.fullName || '';
    }
    return row;
  });

  const workbook = buildWorkbook(columns, rows, 'Visits');
  
  const todayStr = formatCairoDate(new Date()).split('/').reverse().join('-'); // YYYY-MM-DD
  const filename = `visits-${todayStr}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  
  await workbook.xlsx.write(res);
  res.end();
});

exports.exportCompaniesToExcel = asyncHandler(async (req, res) => {
  const maxRows = parseInt(process.env.EXPORT_MAX_ROWS || '10000', 10);
  
  const filter = { isDeleted: false };
  const isAdmin = req.user.role === 'admin';

  if (isAdmin) {
    if (req.query.region) filter.region = req.query.region;
    if (req.query.search) {
      const regex = new RegExp(req.query.search, 'i');
      filter.$or = [{ nameAr: regex }, { nameEn: regex }];
    }
  } else {
    filter.region = req.user.region;
  }

  const count = await Company.countDocuments(filter);
  if (count > maxRows) {
    return res.status(400).json({ success: false, message: 'ضيق الفلاتر' });
  }

  const companies = await Company.find(filter)
    .populate('region', 'name')
    .sort({ nameAr: 1, nameEn: 1 })
    .lean();
    
  // find last visit for each company
  const companyIds = companies.map(c => c._id);
  const lastVisits = await Visit.aggregate([
    { $match: { company: { $in: companyIds }, isDeleted: false } },
    { $sort: { visitDate: -1 } },
    { $group: { _id: '$company', lastDate: { $first: '$visitDate' } } }
  ]);
  const lastVisitMap = {};
  lastVisits.forEach(lv => lastVisitMap[lv._id.toString()] = lv.lastDate);

  let columns = [
    { header: 'الاسم العربي', key: 'nameAr', width: 30 },
    { header: 'الاسم الإنجليزي', key: 'nameEn', width: 30 },
    { header: 'العنوان', key: 'address', width: 40 },
    { header: 'المجال', key: 'industry', width: 25 },
    { header: 'آخر زيارة', key: 'lastVisit', width: 15 }
  ];

  if (isAdmin) {
    columns.splice(2, 0, { header: 'المنطقة', key: 'region', width: 20 });
  }

  const rows = companies.map(c => {
    let row = {
      nameAr: c.nameAr || '',
      nameEn: c.nameEn || '',
      address: c.address || '',
      industry: c.industry || '',
      lastVisit: lastVisitMap[c._id.toString()] ? formatCairoDate(lastVisitMap[c._id.toString()]) : ''
    };
    if (isAdmin) {
      row.region = c.region?.name || '';
    }
    return row;
  });

  const workbook = buildWorkbook(columns, rows, 'Companies');
  
  const todayStr = formatCairoDate(new Date()).split('/').reverse().join('-'); // YYYY-MM-DD
  const filename = `companies-${todayStr}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  
  await workbook.xlsx.write(res);
  res.end();
});
