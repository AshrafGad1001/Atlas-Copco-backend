
const express = require("express");
const { getAdminVisits, getVisit } = require("../controllers/visitController");
const { protect, restrictTo } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(protect);
router.use(restrictTo("admin"));

router.get("/", getAdminVisits);
router.get("/follow-ups", require("../controllers/visitController").getAdminFollowUps);
router.get("/:id", getVisit);
router.route('/:id/follow-up')
  .put(require('../controllers/visitController').upsertFollowUp)
  .patch(require('../controllers/visitController').patchFollowUp)
  .delete(require('../controllers/visitController').deleteFollowUp);


module.exports = router;

