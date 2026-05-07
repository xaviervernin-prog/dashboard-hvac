const router = require('express').Router();
const { verify, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/devis.controller');

router.use(verify);

router.get('/', ctrl.list);
router.post('/', requireRole('administrateur', 'commercial'), ctrl.create);
router.get('/:id', ctrl.get);
router.put('/:id', requireRole('administrateur', 'commercial'), ctrl.update);
router.delete('/:id', requireRole('administrateur'), ctrl.remove);
router.post('/:id/accepter', requireRole('administrateur', 'commercial'), ctrl.accepter);
router.post('/:id/relancer', requireRole('administrateur', 'commercial'), ctrl.relancer);
router.post('/:id/dupliquer', requireRole('administrateur', 'commercial'), ctrl.dupliquer);
router.get('/:id/pdf', ctrl.pdf);
router.post('/:id/facturer', requireRole('administrateur', 'commercial', 'comptable'), ctrl.facturer);

module.exports = router;
