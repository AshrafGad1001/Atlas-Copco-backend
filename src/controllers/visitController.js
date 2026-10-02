const { z } = require('zod');
const Visit = require('../models/Visit');
const asyncHandler = require('../utils/asyncHandler');

exports.visitSchema = z.object({
  company: z.string().min(1, 'الشركة مطلوبة'),
  visitDate: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['planned', 'completed', 'cancelled']).optional()
});

exports.createVisit = asyncHandler(async (req, res) => {
  const visitData = {
    ...req.body,
    engineer: req.user._id // Ensure the engineer is the logged-in user
  };
  const visit = await Visit.create(visitData);
  res.status(201).json({ success: true, data: visit });
});

exports.getVisits = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'engineer') {
    filter.engineer = req.user._id;
  }
  if (req.query.engineerId && req.user.role === 'admin') {
    filter.engineer = req.query.engineerId;
  }
  
  const visits = await Visit.find(filter)
    .populate('company', 'name region')
    .populate('engineer', 'fullName username')
    .sort('-visitDate');
    
  res.status(200).json({ success: true, data: visits });
});

exports.updateVisit = asyncHandler(async (req, res) => {
  const visit = await Visit.findById(req.params.id);
  if (!visit) {
    return res.status(404).json({ success: false, message: 'الزيارة غير موجودة' });
  }

  // Engineer can only update their own visits
  if (req.user.role === 'engineer' && visit.engineer.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'غير مصرح لك بتعديل هذه الزيارة' });
  }

  // 24 hours lock
  if (req.user.role === 'engineer') {
    const hoursSinceCreation = (Date.now() - visit.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation > 24) {
      return res.status(403).json({ success: false, message: 'لا يمكن تعديل الزيارة بعد مرور 24 ساعة على تسجيلها' });
    }
  }

  const updatedVisit = await Visit.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  res.status(200).json({ success: true, data: updatedVisit });
});

exports.deleteVisit = asyncHandler(async (req, res) => {
  const visit = await Visit.findById(req.params.id);
  if (!visit) {
    return res.status(404).json({ success: false, message: 'الزيارة غير موجودة' });
  }

  if (req.user.role === 'engineer' && visit.engineer.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'غير مصرح لك بحذف هذه الزيارة' });
  }

  await visit.deleteOne();
  res.status(200).json({ success: true, message: 'تم حذف الزيارة' });
});
