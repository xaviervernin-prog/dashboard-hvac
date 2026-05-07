const router = require('express').Router();
const { verify } = require('../middleware/auth');
const ctrl = require('../controllers/auth.controller');

router.post('/login', ctrl.login);
router.post('/logout', verify, ctrl.logout);
router.get('/me', verify, ctrl.me);
router.put('/password', verify, ctrl.changePassword);

module.exports = router;
