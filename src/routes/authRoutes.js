const express = require('express');
const { login, loginSchema, getMe, logout } = require('../controllers/authController');
const validate = require('../middlewares/validate');
const { protect } = require('../middlewares/authMiddleware');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 100 : 10,
  message: { success: false, message: 'Too many login attempts, please try again after 15 minutes' }
});

router.post('/login', loginLimiter, validate(loginSchema), login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
