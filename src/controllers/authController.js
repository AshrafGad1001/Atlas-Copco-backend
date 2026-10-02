const { z } = require('zod');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const asyncHandler = require('../utils/asyncHandler');

// Zod Schema for login
exports.loginSchema = z.object({
  username: z.string().min(1, 'اسم المستخدم مطلوب').toLowerCase(),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

exports.login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({
      success: false,
      message: 'اسم المستخدم أو كلمة المرور غير صحيحة'
    });
  }

  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      message: 'هذا الحساب معطل. يرجى التواصل مع الإدارة'
    });
  }

  generateToken(res, user._id, user.role, user.tokenVersion);

  const userResponse = user.toJSON();

  res.status(200).json({
    success: true,
    data: userResponse
  });
});

exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('region', 'name');
  res.status(200).json({
    success: true,
    data: user
  });
});

exports.logout = (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
};
