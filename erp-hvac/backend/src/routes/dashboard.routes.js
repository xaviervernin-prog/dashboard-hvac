const router = require('express').Router();
const { verify } = require('../middleware/auth');
const ctrl = require('../controllers/dashboard.controller');

router.use(verify);
router.get('/', ctrl.stats);

module.exports = router;
