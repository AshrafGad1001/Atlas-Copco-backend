const express = require('express');
const { getRegions, createRegion, updateRegion, deleteRegion, regionSchema } = require('../controllers/regionController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');

const router = express.Router();

router.use(protect, restrictTo('admin'));

router.route('/')
  .get(getRegions)
  .post(validate(regionSchema), createRegion);

router.route('/:id')
  .put(validate(regionSchema), updateRegion)
  .delete(deleteRegion);

module.exports = router;
