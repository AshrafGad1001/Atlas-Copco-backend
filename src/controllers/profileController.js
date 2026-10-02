const { z } = require('zod');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

const phoneSchema = z.object({
  number: z.string().regex(/^[0-9+]{8,15}$/, 'رقم الهاتف غير صحيح'),
  label: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

exports.updateProfileSchema = z.object({
  fullName: z.string().min(2, 'الاسم بالكامل مطلوب').optional(),
  phones: z.array(phoneSchema).min(1, 'رقم هاتف واحد على الأقل مطلوب').optional(),
});

exports.updatePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'كلمة المرور الحالية مطلوبة'),
  newPassword: z.string().min(6, 'كلمة المرور الجديدة 6 أحرف على الأقل'),
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (req.body.fullName) user.fullName = req.body.fullName;
  if (req.body.phones) user.phones = req.body.phones;

  await user.save();
  
  res.status(200).json({ success: true, data: user });
});

exports.updatePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  
  if (!(await user.comparePassword(req.body.oldPassword))) {
    return res.status(401).json({ success: false, message: 'كلمة المرور الحالية غير صحيحة' });
  }

  user.password = req.body.newPassword;
  user.tokenVersion += 1; // Logout from all devices
  await user.save();

  res.status(200).json({ success: true, message: 'تم تغيير كلمة المرور بنجاح، يرجى تسجيل الدخول مجدداً' });
});
