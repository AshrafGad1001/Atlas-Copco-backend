const express = require('express');
const { getStats, exportVisitsToExcel, exportCompaniesToExcel } = require('../controllers/reportController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/stats', restrictTo('admin'), getStats);
router.get('/export-visits', exportVisitsToExcel);
router.get('/export-companies', exportCompaniesToExcel);

module.exports = router;
