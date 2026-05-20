const router = require('express').Router();
const { verify, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/articles.controller');

router.use(verify);

router.get('/categories', ctrl.listCategories);
router.post('/categories', requireRole('administrateur'), ctrl.createCategorie);
router.delete('/categories/:id', requireRole('administrateur'), ctrl.deleteCategorie);
router.get('/stock/alertes', ctrl.stockAlertes);

router.get('/', ctrl.list);
router.post('/', requireRole('administrateur', 'commercial'), ctrl.create);
router.get('/:id', ctrl.get);
router.put('/:id', requireRole('administrateur', 'commercial'), ctrl.update);
router.delete('/:id', requireRole('administrateur'), ctrl.remove);

module.exports = router;
