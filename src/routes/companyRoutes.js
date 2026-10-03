
const express = require("express");
const { createCompany, getCompanies, updateCompany, deleteCompany, companySchema, updateCompanySchema, getCompanyAttendees, getCompanyHistory, mergeCompanies } = require("../controllers/companyController");
const { protect } = require("../middlewares/authMiddleware");
const validate = require("../middlewares/validate");

const router = express.Router();

router.use(protect);

router.route("/")
  .post((req, res, next) => {
    if (req.user && req.user.role === "engineer") {
      req.body.region = req.user.region.toString();
    }
    next();
  }, validate(companySchema), createCompany)
  .get(getCompanies);

router.route("/:id/attendees")
  .get(getCompanyAttendees);

router.route("/:id/history")
  .get(getCompanyHistory);

router.route("/:id")
  .patch((req, res, next) => {
    if (req.user && req.user.role === "engineer") {
      delete req.body.region;
    }
    next();
  }, validate(updateCompanySchema), updateCompany)
  .delete(deleteCompany);


router.route("/:id/merge")
  .post(require("../middlewares/authMiddleware").restrictTo("admin"), mergeCompanies);

module.exports = router;

