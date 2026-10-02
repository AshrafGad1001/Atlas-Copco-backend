const { z } = require('zod');
const Region = require('../models/Region');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');

exports.regionSchema = z.object({
  name: z.string().min(2, 'اسم المنطقة يجب أن يكون حرفين على الأقل').trim(),
});

exports.getRegions = asyncHandler(async (req, res) => {
  const regions = await Region.find().sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: regions });
});

exports.createRegion = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const region = await Region.create({ name });
  res.status(201).json({ success: true, data: region });
});

exports.updateRegion = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const region = await Region.findByIdAndUpdate(
    req.params.id,
    { name },
    { new: true, runValidators: true }
  );

  if (!region) {
    return res.status(404).json({ success: false, message: 'المنطقة غير موجودة' });
  }

  res.status(200).json({ success: true, data: region });
});

exports.deleteRegion = asyncHandler(async (req, res) => {
  const usersInRegion = await User.countDocuments({ region: req.params.id });
  if (usersInRegion > 0) {
    return res.status(400).json({ success: false, message: 'لا يمكن حذف المنطقة لأن بها مهندسين' });
  }

  const region = await Region.findByIdAndDelete(req.params.id);
  if (!region) {
    return res.status(404).json({ success: false, message: 'المنطقة غير موجودة' });
  }

  res.status(200).json({ success: true, message: 'تم حذف المنطقة بنجاح' });
});
