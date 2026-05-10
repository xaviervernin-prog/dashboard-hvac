'use strict';
const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const c = require('../controllers/rh.controller');

router.use(auth);
router.get('/employes',              c.listEmployes);
router.get('/employes/:id',          c.getEmploye);
router.post('/employes',             requireRole('administrateur'), c.createEmploye);
router.put('/employes/:id',          requireRole('administrateur'), c.updateEmploye);
router.get('/conges',                c.listConges);
router.post('/conges',               c.createConge);
router.patch('/conges/:id/statut',   requireRole('administrateur'), c.updateCongeStatut);

module.exports = router;
