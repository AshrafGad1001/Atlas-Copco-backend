
const express = require("express");
const { mergeCompanies } = require("../controllers/companyController");
const { protect, restrictTo } = require("../middlewares/authMiddleware");

const router = express.Router();
router.use(protect);
router.use(restrictTo("admin"));

router.post("/:id/merge", mergeCompanies);

module.exports = router;

