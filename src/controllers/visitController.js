const { z } = require('zod');
const Visit = require('../models/Visit');
const asyncHandler = require('../utils/asyncHandler');

exports.visitSchema = z.object({
  company: z.string().min(1, 'الشركة مطلوبة'),
  visitDate: z.string().optional(),
  type: z.string().optional(),
  notes: z.string().optional(),
  nextStep: z.string().optional(),
  status: z.enum(['planned', 'completed', 'cancelled']).optional(),
  attendees: z.array(z.object({
    name: z.string().min(2, 'الاسم مطلوب').max(100),
    jobTitle: z.string().max(100).optional(),
    phone: z.string().regex(/^[0-9+]{8,15}$/, 'الموبايل غير صالح').optional().or(z.literal(''))
  })).max(10, 'الحد الأقصى 10 أشخاص').optional()
});

exports.createVisit = asyncHandler(async (req, res) => {
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
});

exports.getVisits = asyncHandler(async (req, res) => {
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
  if (!visit || visit.isDeleted) {
    return res.status(404).json({ success: false, message: 'الزيارة غير موجودة' });
  }
  
  if (req.user.role === 'engineer' && visit.engineer.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'غير مصرح' });
  }

  visit.isDeleted = true;
  await visit.save();
  res.status(200).json({ success: true, message: 'تم الحذف بنجاح' });
});
