const fs = require('fs');

let c = fs.readFileSync('src/middlewares/authMiddleware.js', 'utf8');

c = c.replace(/return res\.status\(401\)\.json\(\{ success: false, message: '[^']+' \}\);/g, (match) => {
  if (match.includes('O_OrU^U,')) {
    if (c.indexOf(match) < 400) return 'return res.status(401).json({ success: false, message: "غير مصرح لك بالوصول، يرجى تسجيل الدخول" });';
    if (match.includes('U,U. USO1O_')) return 'return res.status(401).json({ success: false, message: "المستخدم صاحب هذا الحساب لم يعد موجوداً" });';
    if (match.includes('U.O1O')) return 'return res.status(401).json({ success: false, message: "هذا الحساب معطل. يرجى التواصل مع الإدارة" });';
    if (match.includes('OU. OO')) return 'return res.status(401).json({ success: false, message: "تم تغيير بيانات الدخول، يرجى تسجيل الدخول مرة أخرى" });';
    return 'return res.status(401).json({ success: false, message: "جلسة غير صالحة، يرجى تسجيل الدخول" });';
  }
  // Fallback if not matched
  return 'return res.status(401).json({ success: false, message: "غير مصرح لك بالوصول" });';
});

c = c.replace(/return res\.status\(403\)\.json\(\{ success: false, message: '[^']+' \}\);/, 'return res.status(403).json({ success: false, message: "ليس لديك صلاحية لإجراء هذه العملية" });');

fs.writeFileSync('src/middlewares/authMiddleware.js', c);
console.log('Fixed authMiddleware');
