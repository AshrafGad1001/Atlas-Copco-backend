const express = require('express');
const { createVisit, getVisits, updateVisit, deleteVisit, visitSchema } = require('../controllers/visitController');
const { protect } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');

const router = express.Router();

router.use(protect);

router.route('/')
  .post(validate(visitSchema), createVisit)
  .get(getVisits);

router.route('/:id')
  .put(validate(visitSchema), updateVisit)
  .delete(deleteVisit);

module.exports = router;
