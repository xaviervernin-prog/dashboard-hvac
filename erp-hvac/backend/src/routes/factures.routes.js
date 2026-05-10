'use strict';
const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const c = require('../controllers/factures.controller');

router.use(auth);
router.get('/',                   c.list);
router.get('/:id',                c.get);
router.post('/',                  requireRole('administrateur', 'commercial', 'comptable'), c.create);
router.post('/:id/paiements',     requireRole('administrateur', 'comptable'),              c.addPaiement);
router.patch('/:id/statut',       requireRole('administrateur', 'comptable'),              c.updateStatut);

module.exports = router;
