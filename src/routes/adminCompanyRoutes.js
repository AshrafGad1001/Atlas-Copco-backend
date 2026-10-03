
const express = require("express");
const { mergeCompanies, importCompanies } = require("../controllers/companyController");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const { protect, restrictTo } = require("../middlewares/authMiddleware");

const router = express.Router();
router.use(protect);
router.use(restrictTo("admin"));

router.post("/:id/merge", mergeCompanies);
router.post("/import", upload.single("file"), importCompanies);

module.exports = router;

