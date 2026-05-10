'use strict';
const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const c = require('../controllers/vehicules.controller');

router.use(auth);
router.get('/',                     c.list);
router.get('/:id',                  c.get);
router.post('/',                    requireRole('administrateur'), c.create);
router.put('/:id',                  requireRole('administrateur'), c.update);
router.post('/:id/entretiens',      c.addEntretien);

module.exports = router;
