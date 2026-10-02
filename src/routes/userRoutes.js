const express = require('express');
const { getUsers, createUser, updateUser, deleteUser, userSchema } = require('../controllers/userController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');

const router = express.Router();

router.use(protect, restrictTo('admin'));

router.route('/')
  .get(getUsers)
  .post(validate(userSchema), createUser);

router.route('/:id')
  .put(validate(userSchema), updateUser)
  .delete(deleteUser);

module.exports = router;
