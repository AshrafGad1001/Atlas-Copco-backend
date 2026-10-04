
const express = require("express");
const { getOverview, getEngineersStats, getRecentVisits, getStaleCompanies } = require("../controllers/adminStatsController");
const { protect, restrictTo } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(protect);
router.use(restrictTo("admin"));

router.get("/overview", getOverview);
router.get("/engineers", getEngineersStats);
router.get("/recent", getRecentVisits);
router.get("/stale-companies", getStaleCompanies);

module.exports = router;

