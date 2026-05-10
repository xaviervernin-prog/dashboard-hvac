'use strict';
const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const c = require('../controllers/articles.controller');

router.use(auth);
router.get('/categories', c.listCategories);
router.get('/',           c.list);
router.get('/:id',        c.get);
router.post('/',          requireRole('administrateur', 'commercial'), c.create);
router.put('/:id',        requireRole('administrateur', 'commercial'), c.update);
router.delete('/:id',     requireRole('administrateur'),               c.remove);

module.exports = router;
