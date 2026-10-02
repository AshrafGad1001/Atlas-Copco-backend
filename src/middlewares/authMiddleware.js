const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'غير مصرح لك بالوصول، يرجى تسجيل الدخول' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
      return res.status(401).json({ success: false, message: 'المستخدم صاحب هذا الحساب لم يعد موجوداً' });
    }

    if (!currentUser.isActive) {
      return res.status(401).json({ success: false, message: 'هذا الحساب معطل. يرجى التواصل مع الإدارة' });
    }

    if (currentUser.tokenVersion !== decoded.tv) {
      return res.status(401).json({ success: false, message: 'تم تغيير بيانات الدخول، يرجى تسجيل الدخول مرة أخرى' });
    }

    req.user = currentUser;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'جلسة غير صالحة، يرجى تسجيل الدخول' });
  }
});

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية لإجراء هذه العملية' });
    }
    next();
  };
};

module.exports = { protect, restrictTo };
