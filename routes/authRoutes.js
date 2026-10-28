const express = require('express');
const auth = require('../controllers/authController');
const { wrap } = require('../middlewares/errors');

const router = express.Router();

router.post('/signup', wrap(auth.signup));
router.post('/signin', wrap(auth.signin));
router.post('/signout', auth.signout);
router.get('/current_user', wrap(auth.currentUser));

module.exports = router;
