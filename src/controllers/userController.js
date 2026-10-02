const { z } = require('zod');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

const phoneSchema = z.object({
  number: z.string().regex(/^[0-9+]{8,15}$/, 'رقم الهاتف غير صحيح'),
  label: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

exports.userSchema = z.object({
  fullName: z.string().min(2, 'الاسم بالكامل مطلوب'),
  username: z.string().min(3, 'اسم المستخدم يجب أن يكون 3 حروف على الأقل').regex(/^[a-z0-9._-]+$/, 'حروف صغيرة وأرقام فقط'),
  email: z.string().email('بريد إلكتروني غير صحيح'),
  password: z.string().min(6, 'كلمة المرور 6 أحرف على الأقل').optional(),
  role: z.enum(['admin', 'engineer']),
  region: z.string().optional(),
  phones: z.array(phoneSchema).min(1, 'رقم هاتف واحد على الأقل مطلوب للمهندس').optional(),
  isActive: z.boolean().optional(),
});

exports.getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ role: 'engineer' }).populate('region', 'name').sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: users });
});

exports.createUser = asyncHandler(async (req, res) => {
  if (!req.body.password) {
    return res.status(400).json({ success: false, message: 'كلمة المرور مطلوبة', errors: [{ field: 'password', message: 'كلمة المرور مطلوبة' }] });
  }
  
  const user = await User.create(req.body);
  res.status(201).json({ success: true, data: user });
});

exports.updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
  }

  // Update logic
  const updates = { ...req.body };
  if (updates.password) {
    user.password = updates.password;
    delete updates.password;
  }
  
  Object.assign(user, updates);
  await user.save();

  res.status(200).json({ success: true, data: user });
});

exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
  }
  res.status(200).json({ success: true, message: 'تم حذف المستخدم بنجاح' });
});
