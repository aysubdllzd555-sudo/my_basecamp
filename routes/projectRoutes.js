const express = require('express');
const projects = require('../controllers/projectController');
const { requireAuth } = require('../middlewares/auth');
const { wrap } = require('../middlewares/errors');

const router = express.Router();

router.use(requireAuth);
router.get('/', wrap(projects.index));
router.get('/:id', wrap(projects.show));
router.post('/', wrap(projects.create));
router.put('/:id', projects.loadEditable, wrap(projects.update));
router.delete('/:id', projects.loadEditable, wrap(projects.destroy));

module.exports = router;
