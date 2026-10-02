const express = require('express');
const { createCompany, getCompanies, updateCompany, deleteCompany, companySchema, getCompanyAttendees } = require('../controllers/companyController');
const { protect } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');

const router = express.Router();

router.use(protect);

router.route('/')
  .post(validate(companySchema), createCompany)
  .get(getCompanies);

router.route('/:id/attendees')
  .get(getCompanyAttendees);

router.route('/:id')
  .put(validate(companySchema), updateCompany)
  .delete(deleteCompany);

module.exports = router;
