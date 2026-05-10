'use strict';
const router = require('express').Router();
const { auth } = require('../middleware/auth');
const c = require('../controllers/interventions.controller');

router.use(auth);
router.get('/',              c.list);
router.get('/:id',           c.get);
router.post('/',             c.create);
router.put('/:id',           c.update);
router.patch('/:id/statut',  c.updateStatut);

module.exports = router;
