const express = require('express');
const { getEngineerStats } = require('../controllers/adminEngineerController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect, restrictTo('admin'));

router.get('/:id/stats', getEngineerStats);

module.exports = router;
