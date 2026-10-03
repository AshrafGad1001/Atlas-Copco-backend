
const express = require("express");
const { createCompany, getCompanies, updateCompany, deleteCompany, companySchema, updateCompanySchema, getCompanyAttendees, getCompanyHistory } = require("../controllers/companyController");
const { protect } = require("../middlewares/authMiddleware");
const validate = require("../middlewares/validate");

const router = express.Router();

router.use(protect);

router.route("/")
  .post(validate(companySchema), createCompany)
  .get(getCompanies);

router.route("/:id/attendees")
  .get(getCompanyAttendees);

router.route("/:id/history")
  .get(getCompanyHistory);

router.route("/:id")
  .patch(validate(updateCompanySchema), updateCompany)
  .delete(deleteCompany);

module.exports = router;
