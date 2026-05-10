'use strict';
const router = require('express').Router();
const { auth } = require('../middleware/auth');
const c = require('../controllers/auth.controller');

router.post('/login',   c.login);
router.post('/refresh', c.refresh);
router.get('/me', auth, c.me);

module.exports = router;
