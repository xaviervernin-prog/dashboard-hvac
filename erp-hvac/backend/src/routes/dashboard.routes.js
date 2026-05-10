'use strict';
const router = require('express').Router();
const { auth } = require('../middleware/auth');
const c = require('../controllers/dashboard.controller');

router.get('/stats', auth, c.stats);

module.exports = router;
