const express = require('express');
const { updateProfile, updatePassword, updateProfileSchema, updatePasswordSchema } = require('../controllers/profileController');
const { protect } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');

const router = express.Router();

router.use(protect);

router.patch('/', validate(updateProfileSchema), updateProfile);
router.put('/update-password', validate(updatePasswordSchema), updatePassword);

module.exports = router;
