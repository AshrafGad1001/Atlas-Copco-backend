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
router.get('/follow-ups/mine', require('../controllers/visitController').getMineFollowUps);


router.route('/:id/follow-up')
  .put(require('../controllers/visitController').upsertFollowUp)
  .patch(require('../controllers/visitController').patchFollowUp)
  .delete(require('../controllers/visitController').deleteFollowUp);


const upload = require('../middlewares/upload');
router.post('/:id/photos', upload.array('photos', 5), require('../controllers/visitController').uploadPhotos);
router.delete('/:id/photos', require('../controllers/visitController').deletePhoto);

router.route('/:id')


  .get(getVisit)
  .patch(validate(visitSchema), updateVisit)
  .delete(deleteVisit);

module.exports = router;
