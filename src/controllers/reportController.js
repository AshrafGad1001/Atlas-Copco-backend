const xlsx = require('xlsx');
const Visit = require('../models/Visit');
const Company = require('../models/Company');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

exports.getStats = asyncHandler(async (req, res) => {
  const totalVisits = await Visit.countDocuments();
  const totalCompanies = await Company.countDocuments();
  const totalEngineers = await User.countDocuments({ role: 'engineer' });
  
  const visitsByStatus = await Visit.aggregate([
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
  const filter = {};
  if (req.user.role === 'engineer') {
    filter.engineer = req.user._id;
  }

  const visits = await Visit.find(filter)
    .populate('company', 'name region')
    .populate('engineer', 'fullName username')
    .sort('-visitDate')
    .lean(); // Use lean for faster plain JS objects

  const exportData = visits.map(v => ({
    'التاريخ': new Date(v.visitDate).toLocaleDateString('ar-EG'),
    'المهندس': v.engineer?.fullName || 'غير محدد',
    'الشركة': v.company?.name || 'غير محدد',
    'الحالة': v.status === 'completed' ? 'مكتملة' : v.status === 'planned' ? 'مخطط لها' : 'ملغاة',
    'ملاحظات': v.notes || '-'
  }));

  const worksheet = xlsx.utils.json_to_sheet(exportData);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Visits');

  // Generate buffer
  const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', 'attachment; filename="visits_report.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  
  res.status(200).send(buffer);
});
