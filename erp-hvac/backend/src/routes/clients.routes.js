'use strict';
const router = require('express').Router();
const { auth } = require('../middleware/auth');
const c = require('../controllers/clients.controller');

router.use(auth);
router.get('/',                             c.list);
router.get('/:id',                          c.get);
router.post('/',                            c.create);
router.put('/:id',                          c.update);
router.delete('/:id',                       c.remove);
router.post('/:id/chantiers',               c.createChantier);
router.put('/:id/chantiers/:chantierId',    c.updateChantier);

module.exports = router;
