
const express = require("express");
const { getAdminVisits, getVisit } = require("../controllers/visitController");
const { protect, restrictTo } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(protect);
router.use(restrictTo("admin"));

router.get("/", getAdminVisits);
router.get("/:id", getVisit);

module.exports = router;

