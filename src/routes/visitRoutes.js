const express = require('express');
const { createVisit, getVisits, getVisit, updateVisit, deleteVisit, visitSchema } = require('../controllers/visitController');
const { protect } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');

const router = express.Router();

router.use(protect);

router.route('/')
  .post(validate(visitSchema), createVisit)
  

router.get('/mine/summary', require('../controllers/visitController').getMineSummary);
router.get('/mine', getVisits);

router.route('/:id')
  .get(getVisit)
  .patch(validate(visitSchema), updateVisit)
  .delete(deleteVisit);

module.exports = router;
