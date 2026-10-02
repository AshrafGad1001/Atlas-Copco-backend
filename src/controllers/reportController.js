const excel = require('exceljs');
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
  const filter = { isDeleted: { $ne: true } };
  if (req.user.role === 'engineer') {
    filter.engineer = req.user._id;
  }

  const visits = await Visit.find(filter)
    .populate('company', 'name region')
    .populate('engineer', 'fullName username')
    .sort('-visitDate')
    .lean();

  const workbook = new excel.Workbook();
  const worksheet = workbook.addWorksheet('Visits');

  worksheet.columns = [
    { header: 'التاريخ', key: 'date', width: 15 },
    { header: 'المهندس', key: 'engineer', width: 25 },
    { header: 'الشركة', key: 'company', width: 25 },
    { header: 'النوع', key: 'type', width: 15 },
    { header: 'الحالة', key: 'status', width: 15 },
    { header: 'الحاضرين', key: 'attendees', width: 30 },
    { header: 'الملاحظات', key: 'notes', width: 40 },
    { header: 'الخطوة القادمة', key: 'nextStep', width: 30 }
  ];

  visits.forEach(v => {
    worksheet.addRow({
      date: new Date(v.visitDate).toLocaleDateString('ar-EG'),
      engineer: v.engineer?.fullName || 'غير محدد',
      company: v.company?.name || 'غير محدد',
      type: v.type || '-',
      status: v.status === 'completed' ? 'مكتملة' : v.status === 'planned' ? 'مخطط لها' : 'ملغاة',
      attendees: v.attendees && v.attendees.length > 0 ? v.attendees.map(a => `${a.name}${a.jobTitle ? ' ('+a.jobTitle+')' : ''}`).join('، ') : '-',
      notes: v.notes || '-',
      nextStep: v.nextStep || '-'
    });
  });

  res.setHeader('Content-Disposition', 'attachment; filename="visits_report.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  
  await workbook.xlsx.write(res);
  res.end();
});
