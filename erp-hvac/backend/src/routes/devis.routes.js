'use strict';
const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const c = require('../controllers/devis.controller');

router.use(auth);
router.get('/',               c.list);
router.get('/:id',            c.get);
router.post('/',              c.create);
router.put('/:id',            c.update);
router.patch('/:id/statut',   c.updateStatut);
router.post('/:id/facturer',  requireRole('administrateur', 'commercial', 'comptable'), c.facturer);
router.delete('/:id',         c.remove);

module.exports = router;
