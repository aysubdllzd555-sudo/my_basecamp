const express = require('express');
const users = require('../controllers/userController');
const { requireAuth, requireAdmin } = require('../middlewares/auth');
const { wrap } = require('../middlewares/errors');

const router = express.Router();

router.use(requireAuth);
router.get('/', wrap(users.index));
router.get('/:id', wrap(users.show));
router.delete('/:id', wrap(users.destroy));
router.put('/:id/set_admin', requireAdmin, wrap(users.setAdmin));
router.put('/:id/remove_admin', requireAdmin, wrap(users.removeAdmin));

module.exports = router;
